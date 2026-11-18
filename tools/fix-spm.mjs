import { readFileSync, writeFileSync } from 'node:fs';
// The Capacitor CLI on Windows writes OS-specific separators into Swift string literals.
const file = new URL('../ios/App/CapApp-SPM/Package.swift', import.meta.url);
writeFileSync(file, readFileSync(file, 'utf8').replace(/(path: ")[^"]+/g, s => s.replaceAll('\\', '/')));
