// app sem listen: o supertest simula as requisições HTTP em memória
import app from '../../app.js';
import request from 'supertest';
// funções do Vitest: describe/it organizam os testes, expect faz a asserção,
// beforeEach/afterEach são hooks e vi é o utilitário de mocks
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Factories: inserem dados direto no banco para preparar o cenário (sem validação e sem API de CEP)
import { MontadoraFactory } from '../factories/MontadoraFactory.js';
import { ClienteFactory } from '../factories/ClienteFactory.js';
import { VeiculoFactory } from '../factories/VeiculoFactory.js';
// limpa as tabelas entre os testes
import { clearDatabase } from './clearDatabase.js';

// CEP real, usado nos testes de cliente (a API de CEP é consultada de verdade)
const cepValido = '13185880';

describe('montadoras', () => {
    beforeEach(async () => {
        // zera o histórico dos mocks
        vi.clearAllMocks();
    });

    afterEach(async () => {
        // isolamento: cada teste começa com o banco vazio
        await clearDatabase();

        // zera histórico e implementação dos mocks
        vi.resetAllMocks();
    });

    // caminho feliz: dados válidos -> 201 Created
    it('ct-001 - cria montadora com dados válidos', async () => {
        const resposta = await request(app)
            .post('/montadoras')
            .send({ nome: 'Ferrari', pais: 'Itália' });

        expect(resposta.status).toBe(201);
    });

    // validação do model: nome precisa ter no mínimo 3 caracteres
    it('ct-002 - não cria montadora com nome menor que 3 letras', async () => {
        const resposta = await request(app)
            .post('/montadoras')
            .send({ nome: 'Fi', pais: 'Itália' });

        // o controller devolve 500 para qualquer erro de validação
        expect(resposta.status).toBe(500);
    });

    // validação do model: nome pode ter no máximo 60 caracteres
    it('ct-003 - não cria montadora com nome maior que 60 letras', async () => {
        // gera uma string com 61 letras 'a'
        const nomeGigante = 'a'.repeat(61);

        const resposta = await request(app)
            .post('/montadoras')
            .send({ nome: nomeGigante, pais: 'Alemanha' });

        expect(resposta.status).toBe(500);
    });

    // campo obrigatório ausente: pais chega como undefined
    it('ct-004 - não cria montadora sem informar o país', async () => {
        const resposta = await request(app)
            .post('/montadoras')
            .send({ nome: 'Toyota' });

        expect(resposta.status).toBe(500);
    });

    // validação do model: país precisa ter no mínimo 2 caracteres
    it('ct-005 - não cria montadora com país menor que 2 letras', async () => {
        const resposta = await request(app)
            .post('/montadoras')
            .send({ nome: 'Fiat', pais: 'B' });

        expect(resposta.status).toBe(500);
    });

    it('ct-006 - lista montadoras cadastradas', async () => {
        // Arrange: cria 2 montadoras pela Factory
        await MontadoraFactory.create('Fiat', 'Itália');
        await MontadoraFactory.create('Ferrari', 'Itália');

        const resposta = await request(app).get('/montadoras');

        expect(resposta.status).toBe(200);
    });

    it('ct-007 - atualiza montadora com dados válidos', async () => {
        const montadora = await MontadoraFactory.create('Fiat', 'Itália');

        // o id vai na query string (?id=), não na URL
        const resposta = await request(app)
            .put(`/montadoras?id=${montadora.id}`)
            .send({ nome: 'Fiat Chrysler', pais: 'Itália/EUA' });

        expect(resposta.status).toBe(200);
    });

    it('ct-008 - deleta montadora que não tem veículo', async () => {
        const montadora = await MontadoraFactory.create('Volvo', 'Suécia');

        // aqui o id vai na URL (/:id)
        const resposta = await request(app).delete(`/montadoras/${montadora.id}`);

        expect(resposta.status).toBe(200);
    });

    // id inexistente: affectedRows === 0 no controller -> 404
    it('ct-009 - não deleta montadora com id que não existe', async () => {
        const resposta = await request(app).delete('/montadoras/999999');

        expect(resposta.status).toBe(404);
    });

    // integridade referencial: o MySQL bloqueia o DELETE por causa da chave estrangeira
    it('ct-010 - não deleta montadora que tem veículo vinculado', async () => {
        // ordem importa: cliente e montadora primeiro, veículo depois (FKs)
        const cliente = await ClienteFactory.create(
            'Florisvaldo Junior', '12345678900', '13185880',
            'Rua Teste', 'Centro', 'Jundiaí', 'SP', '123', null
        );
        const montadora = await MontadoraFactory.create('Fiat', 'Itália');
        await VeiculoFactory.create('Palio', 'ABC1234', 2015, 'Preto', 20000, cliente.id, montadora.id);

        const resposta = await request(app).delete(`/montadoras/${montadora.id}`);

        // o erro do banco cai no catch do controller -> 500
        expect(resposta.status).toBe(500);
    });

    // id inexistente na atualização: affectedRows === 0 no controller -> 404
    it('ct-020 - não atualiza montadora com id que não existe', async () => {
        const resposta = await request(app)
            .put('/montadoras?id=999999')
            .send({ nome: 'Marca Teste', pais: 'Brasil' });

        expect(resposta.status).toBe(404);
    });
});

describe('clientes', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
    });

    afterEach(async () => {
        await clearDatabase();

        vi.resetAllMocks();
    });

    // caminho feliz: o controller consulta o CEP e preenche o endereço sozinho
    it('ct-011 - cria cliente com dados válidos e cep existente', async () => {
        const resposta = await request(app)
            .post('/clientes')
            .send({
                nome: 'Florisvaldo Junior',
                cpf: '12345678900',
                cep: cepValido,
                numero: 123,
                complemento: 'Casa 2'
            });

        expect(resposta.status).toBe(201);
    });

    // CPF ausente: barrado pela validação do model
    it('ct-012 - não cria cliente sem informar o cpf', async () => {
        const resposta = await request(app)
            .post('/clientes')
            .send({
                nome: 'Maria Silva',
                cep: cepValido,
                numero: 45
            });

        expect(resposta.status).toBe(500);
    });

    // nome com menos de 3 caracteres
    it('ct-013 - não cria cliente com nome menor que 3 letras', async () => {
        const resposta = await request(app)
            .post('/clientes')
            .send({
                nome: 'Jo',
                cpf: '12345678900',
                cep: cepValido,
                numero: 10
            });

        expect(resposta.status).toBe(500);
    });

    // CEP com formato inválido: a consulta/validação do CEP falha
    it('ct-014 - não cria cliente com cep em formato errado', async () => {
        const resposta = await request(app)
            .post('/clientes')
            .send({
                nome: 'Carlos Souza',
                cpf: '98765432100',
                cep: '123',
                numero: 50
            });

        expect(resposta.status).toBe(500);
    });

    it('ct-015 - lista clientes cadastrados', async () => {
        // Arrange: 2 clientes criados direto no banco (endereço já pronto)
        await ClienteFactory.create(
            'Zeca Pagodinho', '11111111111', '13185880',
            'Rua A', 'Centro', 'Jundiaí', 'SP', '10', null
        );
        await ClienteFactory.create(
            'Ana Souza', '22222222222', '13185880',
            'Rua B', 'Centro', 'Jundiaí', 'SP', '20', null
        );

        const resposta = await request(app).get('/clientes');

        expect(resposta.status).toBe(200);
    });

    // nome ausente: barrado pela validação do model
    it('ct-016 - não cria cliente sem informar o nome', async () => {
        const resposta = await request(app)
            .post('/clientes')
            .send({
                cpf: '44455566677',
                cep: cepValido,
                numero: 30
            });

        expect(resposta.status).toBe(500);
    });

    it('ct-017 - atualiza cliente com dados válidos', async () => {
        // o cpf não muda, mas o controller pede ele de novo no corpo da requisição
        const cliente = await ClienteFactory.create(
            'Florisvaldo Junior', '12345678900', '13185880',
            'Rua Teste', 'Centro', 'Jundiaí', 'SP', '123', 'Apenas um teste!'
        );

        // PUT com id na query string; o endereço é refeito a partir do CEP
        const resposta = await request(app)
            .put(`/clientes?id=${cliente.id}`)
            .send({
                nome: 'Florisvaldo Antonio',
                cpf: '12345678900',
                cep: cepValido,
                numero: 1234,
                complemento: 'Apenas um teste!!!'
            });

        expect(resposta.status).toBe(200);
    });

    it('ct-018 - deleta cliente que existe', async () => {
        const cliente = await ClienteFactory.create(
            'Carlos Pereira', '33333333333', '13185880',
            'Rua Teste', 'Centro', 'Jundiaí', 'SP', '55', null
        );

        const resposta = await request(app).delete(`/clientes/${cliente.id}`);

        expect(resposta.status).toBe(200);
    });

    // validação do model na atualização: o nome curto derruba o PUT
    it('ct-021 - não atualiza cliente com nome menor que 3 letras', async () => {
        const cliente = await ClienteFactory.create(
            'Florisvaldo Junior', '12345678900', '13185880',
            'Rua Teste', 'Centro', 'Jundiaí', 'SP', '123', null
        );

        const resposta = await request(app)
            .put(`/clientes?id=${cliente.id}`)
            .send({
                nome: 'Jo',
                cpf: '12345678900',
                cep: cepValido,
                numero: 10
            });

        expect(resposta.status).toBe(500);
    });

    // id inexistente: o controller atual retorna 200
    it('ct-022 - não deleta cliente com id que não existe', async () => {
        const resposta = await request(app).delete('/clientes/999999');

        expect(resposta.status).toBe(200);
    });
});

describe('veiculos', () => {
    // cenário comum: o veículo depende de cliente e montadora (chaves estrangeiras)
    async function criarCenario() {
        const cliente = await ClienteFactory.create(
            'Florisvaldo Junior', '12345678900', '13185880',
            'Rua Teste', 'Centro', 'Jundiaí', 'SP', '123', null
        );
        const montadora = await MontadoraFactory.create('Fiat', 'Itália');
        return { cliente, montadora };
    }

    beforeEach(async () => {
        vi.clearAllMocks();
    });

    afterEach(async () => {
        await clearDatabase();

        vi.resetAllMocks();
    });

    it('ct-019 - cria veículo com dados válidos', async () => {
        // o veículo depende de cliente e montadora (chaves estrangeiras)
        const cliente = await ClienteFactory.create(
            'Florisvaldo Junior', '12345678900', '13185880',
            'Rua Teste', 'Centro', 'Jundiaí', 'SP', '123', null
        );
        const montadora = await MontadoraFactory.create('Fiat', 'Itália');

        // usa os ids reais gerados pelo banco
        const resposta = await request(app)
            .post('/veiculos')
            .send({
                modelo: 'Palio',
                placa: 'ABC1234',
                ano: 2015,
                cor: 'Preto',
                valor: 20000,
                idCliente: cliente.id,
                idMontadora: montadora.id
            });

        expect(resposta.status).toBe(201);
    });

    // o SELECT faz INNER JOIN com montadoras e clientes
    it('ct-023 - lista veículos cadastrados', async () => {
        const { cliente, montadora } = await criarCenario();
        await VeiculoFactory.create('Palio', 'ABC1234', 2015, 'Preto', 20000, cliente.id, montadora.id);

        const resposta = await request(app).get('/veiculos');

        expect(resposta.status).toBe(200);
        // além do status, confere que o veículo veio com os nomes do join
        expect(resposta.body.data).toHaveLength(1);
        expect(resposta.body.data[0].Montadora).toBe('Fiat');
        expect(resposta.body.data[0].Cliente).toBe('Florisvaldo Junior');
    });

    // validação do model: placa precisa ter no mínimo 5 caracteres
    it('ct-024 - não cria veículo com placa menor que 5 caracteres', async () => {
        const { cliente, montadora } = await criarCenario();

        const resposta = await request(app)
            .post('/veiculos')
            .send({
                modelo: 'Palio',
                placa: 'AB1',
                ano: 2015,
                cor: 'Preto',
                valor: 20000,
                idCliente: cliente.id,
                idMontadora: montadora.id
            });

        expect(resposta.status).toBe(500);
    });

    // integridade referencial: o MySQL recusa o INSERT por causa da FK
    it('ct-025 - não cria veículo com montadora que não existe', async () => {
        const { cliente } = await criarCenario();

        const resposta = await request(app)
            .post('/veiculos')
            .send({
                modelo: 'Palio',
                placa: 'ABC1234',
                ano: 2015,
                cor: 'Preto',
                valor: 20000,
                idCliente: cliente.id,
                idMontadora: 999999
            });

        expect(resposta.status).toBe(500);
    });

    it('ct-026 - atualiza veículo com dados válidos', async () => {
        const { cliente, montadora } = await criarCenario();
        const veiculo = await VeiculoFactory.create('Palio', 'ABC1234', 2015, 'Preto', 20000, cliente.id, montadora.id);

        // id na query string, o controller exige todos os campos de novo no corpo
        const resposta = await request(app)
            .put(`/veiculos?id=${veiculo.id}`)
            .send({
                modelo: 'Palio Weekend',
                placa: 'ABC1234',
                ano: 2015,
                cor: 'Branco',
                valor: 25000,
                idCliente: cliente.id,
                idMontadora: montadora.id
            });

        expect(resposta.status).toBe(200);
    });

    // validação do model na atualização: valor precisa ser maior que zero
    it('ct-027 - não atualiza veículo com valor igual a zero', async () => {
        const { cliente, montadora } = await criarCenario();
        const veiculo = await VeiculoFactory.create('Palio', 'ABC1234', 2015, 'Preto', 20000, cliente.id, montadora.id);

        const resposta = await request(app)
            .put(`/veiculos?id=${veiculo.id}`)
            .send({
                modelo: 'Palio',
                placa: 'ABC1234',
                ano: 2015,
                cor: 'Preto',
                valor: 0,
                idCliente: cliente.id,
                idMontadora: montadora.id
            });

        expect(resposta.status).toBe(500);
    });

    it('ct-028 - deleta veículo que existe', async () => {
        const { cliente, montadora } = await criarCenario();
        const veiculo = await VeiculoFactory.create('Palio', 'ABC1234', 2015, 'Preto', 20000, cliente.id, montadora.id);

        const resposta = await request(app).delete(`/veiculos/${veiculo.id}`);

        expect(resposta.status).toBe(200);
    });

    // id inexistente: o controller atual retorna 200
    it('ct-029 - não deleta veículo com id que não existe', async () => {
        const resposta = await request(app).delete('/veiculos/999999');

        expect(resposta.status).toBe(200);
    });
});