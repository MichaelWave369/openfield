import { generateKeyPairSync, randomUUID } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const keyId = `openfield:${new Date().toISOString().slice(0, 10)}:${randomUUID().slice(0, 8)}`;

const privateDer = privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
const publicDer = publicKey.export({ format: "der", type: "spki" }).toString("base64");

console.log("# Store the private key in a secret manager. Do not commit this output.");
console.log(`OPENFIELD_SIGNING_KEY_ID=${keyId}`);
console.log(`OPENFIELD_SIGNING_PRIVATE_KEY=${privateDer}`);
console.log(`OPENFIELD_SIGNING_PUBLIC_KEY=${publicDer}`);
