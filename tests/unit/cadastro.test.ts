import { cpfValido, lerPlanilha, separarLinhas, validarCliente } from '../../src/data/cadastro'

describe('cadastro de clientes', () => {
  it('confere o CPF pelos dígitos verificadores', () => {
    expect(cpfValido('529.982.247-25')).toBe(true)
    expect(cpfValido('52998224724')).toBe(false)
    expect(cpfValido('111.111.111-11')).toBe(false)
    expect(cpfValido('1114447773')).toBe(false)
    expect(cpfValido('011.144.477-35'.replace(/^0/, ''))).toBe(cpfValido('01114447735'))
  })

  it('valida como o servidor', () => {
    expect(validarCliente({ nome: ' ' })).toBe('Informe o nome.')
    expect(validarCliente({ nome: 'Ana Souza', cpf: '123.456.789-00' })).toBe('CPF inválido.')
    expect(validarCliente({ nome: 'Ana Souza', telefone: '9999-0000' })).toBe('Telefone precisa ter DDD e número.')
    expect(validarCliente({ nome: 'Ana Souza', telefone: '+55 (49) 99999-0000' })).toBeNull()
    expect(validarCliente({ nome: 'Ana Souza', email: 'ana@' })).toBe('E-mail inválido.')
    expect(validarCliente({ nome: 'Ana Souza', cpf: '', email: '' })).toBeNull()
  })

  it('separa planilha colada (tabulação) e CSV com aspas', () => {
    expect(separarLinhas('Nome\tCPF\nAna\t529.982.247-25\n')).toEqual([['Nome', 'CPF'], ['Ana', '529.982.247-25']])
    expect(separarLinhas('nome;telefone\r\n"Souza; Ana";49 99999-0000')).toEqual([['nome', 'telefone'], ['Souza; Ana', '49 99999-0000']])
    expect(separarLinhas('a,b\n"x ""y""",2\n\n')).toEqual([['a', 'b'], ['x "y"', '2']])
  })

  it('acha as colunas pelo cabeçalho em qualquer ordem', () => {
    const p = lerPlanilha('Celular;E-mail;Nome completo;CPF\n49999990000;ana@x.com;Ana Souza;52998224725')
    expect(p.comCabecalho).toBe(true)
    expect(p.clientes).toEqual([{ nome: 'Ana Souza', cpf: '52998224725', telefone: '49999990000', email: 'ana@x.com' }])
  })

  it('sem cabeçalho, lê na ordem padrão e avisa', () => {
    const p = lerPlanilha('Ana Souza,52998224725\nBruno Lima,')
    expect(p.comCabecalho).toBe(false)
    expect(p.aviso).toMatch(/ordem/)
    expect(p.clientes.map((c) => c.nome)).toEqual(['Ana Souza', 'Bruno Lima'])
  })
})
