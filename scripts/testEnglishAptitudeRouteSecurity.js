const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.once('error', reject);
  });
}

function request(server, path, { method = 'GET', headers = {}, body } = {}) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: address.port,
      path,
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let json;
        try { json = JSON.parse(raw); } catch {}
        resolve({ status: res.statusCode, body: json, raw });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

async function close(server) {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

async function main() {
  const authPath = require.resolve('../middlewares/auth');
  const routePath = require.resolve('../routes/englishAptitude');
  const originalAuthModule = require.cache[authPath];
  const originalRouteModule = require.cache[routePath];
  const originalFlag = process.env.ENGLISH_APTITUDE_PREVIEW_ENABLED;
  const answers = require('../data/englishAptitudeL1S1StoryAnswers');

  let authServer;
  let routeServer;
  try {
    // Exercise the real shared middleware's unauthenticated boundary without needing a database.
    const realAuth = require('../middlewares/auth');
    const authApp = express();
    authApp.get('/protected', realAuth.requireAuth, (_req, res) => res.status(200).json({ success: true }));
    authServer = await listen(authApp);
    const unauthenticated = await request(authServer, '/protected');
    assert.equal(unauthenticated.status, 401, 'The shared auth middleware must reject requests without a session.');

    // Isolate route-level flag and response-contract tests from the database-backed user lookup.
    require.cache[authPath] = {
      id: authPath,
      filename: authPath,
      loaded: true,
      exports: {
        requireAuth(req, res, next) {
          if (req.headers['x-test-auth'] !== 'valid') {
            return res.status(401).json({ success: false, message: 'Authentication required' });
          }
          return next();
        },
      },
    };
    delete require.cache[routePath];
    const route = require('../routes/englishAptitude');
    const routeApp = express();
    routeApp.use(express.json());
    routeApp.use('/api/english-aptitude', route);
    routeServer = await listen(routeApp);

    process.env.ENGLISH_APTITUDE_PREVIEW_ENABLED = 'false';
    const disabled = await request(routeServer, '/api/english-aptitude/grade', {
      method: 'POST',
      body: {},
    });
    assert.equal(disabled.status, 401, 'Authentication must be checked before the feature flag response.');

    const disabledAuthenticated = await request(routeServer, '/api/english-aptitude/grade', {
      method: 'POST',
      headers: { 'x-test-auth': 'valid' },
      body: {},
    });
    assert.equal(disabledAuthenticated.status, 503, 'Grading must remain disabled unless explicitly enabled.');
    assert.equal(disabledAuthenticated.body.success, false);

    process.env.ENGLISH_APTITUDE_PREVIEW_ENABLED = 'true';
    const sample = answers[0];
    const graded = await request(routeServer, '/api/english-aptitude/grade', {
      method: 'POST',
      headers: { 'x-test-auth': 'valid' },
      body: {
        activityId: sample.activityId,
        questionId: sample.questionId,
        selectedAnswer: sample.answer,
        answer: sample.answer,
        isCorrect: false,
      },
    });
    assert.equal(graded.status, 200);
    assert.equal(graded.body.isCorrect, true, 'The server must ignore client-supplied correctness.');
    assert.equal('answer' in graded.body, false, 'The response must not expose the answer key.');
    assert.equal('options' in graded.body, false, 'The response must not expose answer options.');
    assert.equal('feedbackCorrect' in graded.body, false);
    assert.equal('feedbackIncorrect' in graded.body, false);
    assert.equal('explanation' in graded.body, true, 'Explanation may be returned after a correct answer.');

    const incorrect = await request(routeServer, '/api/english-aptitude/grade', {
      method: 'POST',
      headers: { 'x-test-auth': 'valid' },
      body: {
        activityId: sample.activityId,
        questionId: sample.questionId,
        selectedAnswer: sample.options.find(option => option !== sample.answer),
      },
    });
    assert.equal(incorrect.status, 200);
    assert.equal(incorrect.body.isCorrect, false);
    assert.equal('explanation' in incorrect.body, false, 'Incorrect answers must not receive the explanation.');

    console.log('English Aptitude route security tests passed: real middleware rejects missing sessions, grading stays disabled by default, client correctness is ignored, and responses do not expose answer-key fields.');
  } finally {
    if (authServer) await close(authServer);
    if (routeServer) await close(routeServer);
    if (originalAuthModule) require.cache[authPath] = originalAuthModule;
    else delete require.cache[authPath];
    if (originalRouteModule) require.cache[routePath] = originalRouteModule;
    else delete require.cache[routePath];
    if (originalFlag === undefined) delete process.env.ENGLISH_APTITUDE_PREVIEW_ENABLED;
    else process.env.ENGLISH_APTITUDE_PREVIEW_ENABLED = originalFlag;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
