const ARGSV = require('yargs').usage('usage: $0 <command>')
  .options('name', {alias: 'n', describe: 'The name of swagger to be created.'})
  .example('name', '--name=test')
  .help('h').alias('h', 'help')
  .fail(function(msg, err) {
    if (err) {
      throw err;
    }
    console.error('Error in params passed!');
    console.error(msg);
    process.exit(1);
  }).argv;
const Generator = require('./class/Generator');

(new Generator(ARGSV.name));

process.on('uncaughtException', (err) => console.log('Exception:', err));
process.on('unhandledRejection', (reason, p) => console.log('Unhandled Rejection at: Promise ', p, ' reason: ', reason));
