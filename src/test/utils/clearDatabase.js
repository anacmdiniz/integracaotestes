import { connection } from '../../configs/Database.js';

// esvazia as tabelas para que um teste não interfira no outro
export async function clearDatabase() {
    // desliga a checagem de chaves estrangeiras (permite apagar em qualquer ordem)
    // usa query() porque SET não funciona bem como prepared statement (execute)
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // apaga primeiro quem tem FK (veículos), depois as tabelas referenciadas
    await connection.query('DELETE FROM veiculos');
    await connection.query('DELETE FROM clientes');
    await connection.query('DELETE FROM montadoras');

    // religa a checagem para não afetar os próximos testes
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
}