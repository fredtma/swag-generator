const Generator = require('./class/Generator');

(new Generator());

process.on('uncaughtException', (err) => console.log("Exception:", err));
process.on('unhandledRejection', (reason, p) => console.log("Unhandled Rejection at: Promise ", p, " reason: ", reason));
