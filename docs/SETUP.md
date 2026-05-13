# Setup Guide

1. Ensure **Node.js (v18+)** is installed.
2. We are using **npm workspaces** for package management.
3. Install dependencies: `npm install` *(pending execution in upcoming phases)*
4. Run emulators: `npm run emulators` *(pending execution in upcoming phases)*

## Sound Local Port Policy
- Sound uses custom emulator ports to avoid conflicts with other local projects.
- Auth: 19099, Functions: 15001, Firestore: 18080, Storage: 19199, Hosting: 15002, Emulator UI: 14000.
- Do not change ports without checking other projects.
- Do not run emulators before confirming Java is installed.
- Do not run emulators while another project uses the same ports.
