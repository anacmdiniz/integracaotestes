import { connection } from "../../configs/Database.js"

export class VeiculoFactory {
    static async create(modelo, placa, ano, cor, valor, id_cliente, id_montadora) {
        const [result] = await connection.execute(
            `INSERT INTO veiculos (modelo, placa, ano, cor, valor, IdCliente, IdMontadora) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [modelo, placa, ano, cor, valor, id_cliente, id_montadora]
        );

        return {
            id: result.insertId, modelo, placa, ano, cor, valor, id_cliente, id_montadora
        }

    }
}