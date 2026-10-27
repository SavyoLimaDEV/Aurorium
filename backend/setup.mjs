import {database,initialize,reset,all} from './store.mjs';
if(process.argv.includes('--reset')){reset();console.log('Dados restaurados.')}else{const created=initialize();console.log(created?'Banco SQLite inicializado.':'Banco já inicializado.')}console.log('Usuários:',all('users').length,'Mesas:',all('tables').length);database.close();
