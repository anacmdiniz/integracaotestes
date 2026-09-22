import app from '../../app.js';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MontadoraFactory } from '../factories/MontadoraFactory.js';
import { ClienteFactory } from '../factories/ClienteFactory.js';
import { VeiculoFactory } from '../factories/VeiculoFactory.js';
import { clearDatabase } from './clearDatabase.js';

const cepValido = '13185880';

describe('montadoras', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
    });

    afterEach(async () => {
        await clearDatabase();

        vi.resetAllMocks();
    });

    it('ct-001 - cria montadora com dados válidos', async () => {
        const resposta = await request(app)
            .post('/montadoras')
            .send({ nome: 'Ferrari', pais: 'Itália' });

        expect(resposta.status).toBe(201);
    });

    it('ct-002 - não cria montadora com nome menor que 3 letras', async () => {
        const resposta = await request(app)
            .post('/montadoras')
            .send({ nome: 'Fi', pais: 'Itália' });

        expect(resposta.status).toBe(500);
    });

    it('ct-003 - não cria montadora com nome maior que 60 letras', async () => {
        const nomeGigante = 'a'.repeat(61);

        const resposta = await request(app)
            .post('/montadoras')
            .send({ nome: nomeGigante, pais: 'Alemanha' });

        expect(resposta.status).toBe(500);
    });

    it('ct-004 - não cria montadora sem informar o país', async () => {
        const resposta = await request(app)
            .post('/montadoras')
            .send({ nome: 'Toyota' });

        expect(resposta.status).toBe(500);
    });

    it('ct-005 - não cria montadora com país menor que 2 letras', async () => {
        const resposta = await request(app)
            .post('/montadoras')
            .send({ nome: 'Fiat', pais: 'B' });

        expect(resposta.status).toBe(500);
    });

    it('ct-006 - lista montadoras cadastradas', async () => {
        await MontadoraFactory.create('Fiat', 'Itália');
        await MontadoraFactory.create('Ferrari', 'Itália');

        const resposta = await request(app).get('/montadoras');

        expect(resposta.status).toBe(200);
    });

    it('ct-007 - atualiza montadora com dados válidos', async () => {
        const montadora = await MontadoraFactory.create('Fiat', 'Itália');

        const resposta = await request(app)
            .put(`/montadoras?id=${montadora.id}`)
            .send({ nome: 'Fiat Chrysler', pais: 'Itália/EUA' });

        expect(resposta.status).toBe(200);
    });

    it('ct-008 - deleta montadora que não tem veículo', async () => {
        const montadora = await MontadoraFactory.create('Volvo', 'Suécia');

        const resposta = await request(app).delete(`/montadoras/${montadora.id}`);

        expect(resposta.status).toBe(200);
    });

    it('ct-009 - não deleta montadora com id que não existe', async () => {
        const resposta = await request(app).delete('/montadoras/999999');

        expect(resposta.status).toBe(404);
    });

    it('ct-010 - não deleta montadora que tem veículo vinculado', async () => {
        const cliente = await ClienteFactory.create(
            'Florisvaldo Junior', '12345678900', '13185880',
            'Rua Teste', 'Centro', 'Jundiaí', 'SP', '123', null
        );
        const montadora = await MontadoraFactory.create('Fiat', 'Itália');
        await VeiculoFactory.create('Palio', 'ABC1234', 2015, 'Preto', 20000, cliente.id, montadora.id);

        const resposta = await request(app).delete(`/montadoras/${montadora.id}`);

        expect(resposta.status).toBe(500);
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

    it('ct-017 - atualiza cliente com dados válidos', async () => {
        // o cpf não muda, mas o controller pede ele de novo no corpo da requisição
        const cliente = await ClienteFactory.create(
            'Florisvaldo Junior', '12345678900', '13185880',
            'Rua Teste', 'Centro', 'Jundiaí', 'SP', '123', 'Apenas um teste!'
        );

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
});