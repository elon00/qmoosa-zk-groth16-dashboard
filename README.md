# QMOOSA Groth16 proof verifier

A local dashboard that verifies real snarkjs Groth16 BN254 proof/key/public-input artifacts using the existing QMOOSA SDK and pairing engine. It accepts normal and zero-input proofs, rejects invalid proofs and malformed input, and displays calldata only after successful verification.

## Run locally

Use Node 24 and sibling checkouts named qmoosa-zk-groth16-protocol (9b7f29227196b57f2c3d9f52cb123f72c5fd6afc), qmoosa-zk-groth16-engine (001b1ee757fa19f47eccb7f7e4c573c77cd4c668) and qmoosa-zk-groth16-sdk (b28fffc05dd01902fd1c85d5977b340972813b3d). Build protocol, engine and SDK in that order using npm ci --ignore-scripts and npm run build. In this dashboard run npm ci --ignore-scripts then npm start. Open http://127.0.0.1:3000. PORT can select another local port. Stop with Ctrl+C.

Paste the verification key, proof and public inputs as JSON, or load a supplied example. Verification takes place in the local Node process; no data is sent to a third-party service and no blockchain transaction is made. Public inputs are limited to 256 values and the request body to 128 KiB. The server binds only to 127.0.0.1, restricts origins and served files, and does not expose a general filesystem route. This local developer tool is not a public hosted verification service.

## Acceptance tests

npm test executes actual HTTP-to-SDK verification for both genuine fixtures and tampered input, malformed artifacts, body limits, route/origin restrictions and error handling. npm run lint checks server, browser and test syntax.

For browser acceptance install the test tool with npm install --no-save --package-lock=false --ignore-scripts playwright@1.62.1 and npx playwright install chromium, then npm run test:browser. An existing Playwright 1.62.1 installation can be selected with PLAYWRIGHT_MODULE_URL and a local Chromium executable with PLAYWRIGHT_CHROMIUM_EXECUTABLE. Missing browsers fail the test; they are not skipped. Tests start and close their own bounded local server. CI also executes these browser tests against the real verifier.

## Provenance and limits

public/examples contains combined public proof/key/input data from engine commit 001b1ee757fa19f47eccb7f7e4c573c77cd4c668. provenance.json retains immutable upstream identities and source hashes. The two proofs were independently verified with snarkjs 0.7.6. The upstream circuit was from iden3/snarkjs commit 22003fbcde78608be902520661832db7933d279e (GPL-3.0). Only public artifacts are shipped. The example setup is test-only; proving keys, witness files and ceremony secrets are absent.

Successful proof verification is specific to the supplied key and inputs. It does not establish application-level claims, a production ceremony, CodeQL approval, independent security review, on-chain integration or production certification. Engine and SDK dependencies currently use tested development commits pending normal review/integration.
