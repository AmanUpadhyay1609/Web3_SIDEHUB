# Web3-Sidehub

A TypeScript SDK for blockchain interactions using Sidehub.

## Overview

**Web3-Sidehub** is a TypeScript SDK designed to facilitate blockchain interactions using various blockchain networks. It integrates with Ethereum via [ethers](https://docs.ethers.org/) and [web3.js](https://web3js.readthedocs.io/en/v1.10.0/), as well as Solana through [@solana/web3.js](https://solana-labs.github.io/solana-web3.js/). This repository serves as a starting point for developers building blockchain applications with a unified SDK.

## Features

- TypeScript support for robust development.
- Integration with Ethereum and Solana blockchains.
- Ready-made scripts for building, running, and development using nodemon.

## Project Structure

- `src/`: Contains the TypeScript source code.
- `example.ts`: An example script demonstrating how to use the SDK.
- `.env.example`: Example environment variables configuration.
- `tsconfig.json`: TypeScript configuration file.
- `package.json`: Contains project metadata and dependencies.

## Getting Started

### Prerequisites

Ensure you have Node.js and npm installed. (Recommended version: Node.js 14.x or above)

### Installation

Clone the repository and install dependencies:

```
git clone https://github.com/AmanUpadhyay1609/Web3_SIDEHUB.git
cd Web3_SIDEHUB
npm install
```

### Usage

#### Building the Project

To compile the TypeScript code, run:

```
npm run build
```

#### Running the Project

After building, start the project using:

```
npm run start
```

#### Development Mode

For automatic recompilation and restart during development, run:

```
npm run dev
```

## Configuration

Rename `.env.example` to `.env` and fill in the necessary environment variables.

## Contributing

Contributions are welcome! Please follow the standard GitHub flow: fork the repository, create a new branch, and submit a pull request.

## License

This project is licensed under the MIT License.

## Contact

For any inquiries, please reach out to [Aman Upadhyay](aman.upadhyay@thewasserstoff.com).
