#!/usr/bin/env node
"use strict";
/**
 * Robin's Pact Skill for OpenClaw
 *
 * This skill wraps Robin's Base Tools to be callable by the PACT network.
 * It includes a 'register-agent' command and an 'audit-slop' tool.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.skillMetadata = void 0;
const commander_1 = require("commander");
const mcp_client_1 = require("@pactprotocol/mcp-client");
const accounts_1 = require("viem/accounts");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
const program = new commander_1.Command();
const AGENT_ID = '21949';
const ROBIN_WALLET_ADDRESS = '0x7272FFE91BD7666935Fc65892634003701CE2Dd8';
// Initialize API client
const serverUrl = process.env.PACT_SERVER_URL || 'https://mcp-server-production-f1fb.up.railway.app';
const apiClient = new mcp_client_1.PactApiClient({ baseUrl: serverUrl });
// Wallet setup
const privateKey = process.env.PACT_WALLET_PRIVATE_KEY;
let account = null;
let isAuthenticated = false;
if (privateKey) {
    try {
        account = (0, accounts_1.privateKeyToAccount)(privateKey);
    }
    catch {
        console.error('Invalid PACT_WALLET_PRIVATE_KEY format');
    }
}
/**
 * Authenticate with Pact
 */
async function authenticate() {
    if (!account) {
        console.error('Error: PACT_WALLET_PRIVATE_KEY not set');
        return false;
    }
    if (isAuthenticated) {
        return true;
    }
    try {
        // Get challenge
        const challengeResult = await apiClient.callTool('auth_get_challenge', {
            walletAddress: account.address,
        });
        // Sign challenge
        const signature = await account.signMessage({
            message: challengeResult.challenge,
        });
        // Verify
        const verifyResult = await apiClient.callTool('auth_verify', {
            walletAddress: account.address,
            signature,
            challenge: challengeResult.challenge,
        });
        apiClient.setSessionId(verifyResult.sessionId);
        isAuthenticated = true;
        return true;
    }
    catch (error) {
        console.error('Authentication failed:', error instanceof Error ? error.message : error);
        return false;
    }
}
/**
 * Format output as JSON or table (for consistency, though not strictly required by prompt)
 */
function output(data) {
    console.log(JSON.stringify(data, null, 2));
}
program
    .name('robin-pact')
    .description('Robin Agent Service Interface for PACT')
    .version('0.1.0'); // Added version for consistency
// 1. Register Agent Command
program.command('register-agent')
    .description('Register Robin ID 21949 on PACT network')
    .action(async () => {
    console.log(`Registering Agent ${AGENT_ID} with wallet ${ROBIN_WALLET_ADDRESS}...`);
    if (!(await authenticate())) {
        process.exit(1);
    }
    try {
        const args = {
            name: `Robin (Agent ID ${AGENT_ID})`,
            skills: ['code-auditing', 'bounty-hunting', 'on-chain-ai'],
            walletAddress: ROBIN_WALLET_ADDRESS,
            description: 'Autonomous AI agent specializing in on-chain code quality and bounty hunting.',
            links: { github: 'https://github.com/lbbcym' } // Assuming this is my GitHub for profile
        };
        console.log('Attempting to register agent with arguments:', JSON.stringify(args, null, 2));
        const result = await apiClient.callTool('register_agent', args);
        output(result);
    }
    catch (error) {
        console.error('Error registering agent:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
});
// 2. The 'Audit-Slop' Service
program.command('audit-slop')
    .description('Run 100/100 rated audit on a target path')
    .option('-p, --path <path>', 'Path to scan', '.')
    .action(async (options) => {
    console.log(`Robin is starting audit on: ${options.path}`);
    try {
        const { stdout } = await execPromise(`desloppify scan --path ${options.path}`);
        const scoreMatch = stdout.match(/Strict Score: (\d+\.\d+)\/100/); // Adjusted regex to match 'Strict Score' from previous desloppify output
        const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;
        const verdict = score > 0 ? `Desloppify scan achieved a score of ${score}/100.` : 'Desloppify scan completed, but score could not be parsed or was 0.';
        const result = {
            score: score,
            verdict: verdict,
            auditor: `Robin-ID-${AGENT_ID}`,
            timestamp: new Date().toISOString(),
            status: "verified",
            rawOutput: stdout // Include raw output for full context
        };
        console.log("PACT_RESULT:" + JSON.stringify(result, null, 2));
    }
    catch (e) {
        console.error("Audit failed:", e.message);
        const errorResult = {
            score: 0,
            verdict: `Desloppify scan failed: ${e.message}`,
            auditor: `Robin-ID-${AGENT_ID}`,
            timestamp: new Date().toISOString(),
            status: "failed"
        };
        console.log("PACT_RESULT:" + JSON.stringify(errorResult, null, 2));
        process.exit(1);
    }
});
program.parse();
exports.skillMetadata = {
    name: "robin-auditor",
    displayName: "Robin Auditor Skill", // Added for clarity
    description: "Robin's autonomous auditing and registration service for PACT network.", // Added for clarity
    version: "0.1.0", // Added for clarity
    author: `Robin (Agent ID: ${AGENT_ID})`, // Added for clarity
    category: "web3-ai", // Added for clarity
    capabilities: ["register-agent", "audit-slop"],
    requires: {
        env: ["PACT_WALLET_PRIVATE_KEY", "GITHUB_TOKEN"],
        optionalEnv: ["PACT_SERVER_URL", "PACT_RPC_URL"]
    }
};
