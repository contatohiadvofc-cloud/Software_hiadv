import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../../src/design/components/Button'
import { Field } from '../../src/design/components/Field'
import { ErrorState } from '../../src/design/components/ErrorState'
import { Empty } from '../../src/design/components/Empty'
import { Badge } from '../../src/design/components/Badge'

describe('Button', () => {
  it('fica desabilitado e ocupado enquanto carrega', () => {
    render(<Button loading>Salvar</Button>)
    const b = screen.getByRole('button', { name: /salvar/i })
    expect(b).toBeDisabled()
    expect(b).toHaveAttribute('aria-busy', 'true')
  })
})

describe('Field', () => {
  it('liga o erro ao campo por aria-describedby', () => {
    render(<Field label="E-mail" error="Informe o e-mail." />)
    const input = screen.getByLabelText('E-mail')
    const erro = screen.getByText('Informe o e-mail.')
    expect(input.getAttribute('aria-describedby')).toContain(erro.id)
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('ErrorState', () => {
  it('mostra a mensagem padrão e tenta de novo', async () => {
    const tentar = vi.fn()
    render(<ErrorState onRetry={tentar} />)
    expect(screen.getByText('Não foi possível carregar.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(tentar).toHaveBeenCalledOnce()
  })
})

describe('Empty e Badge', () => {
  it('Empty mostra o título', () => {
    render(<Empty title="Nada pendente para hoje." />)
    expect(screen.getByText('Nada pendente para hoje.')).toBeInTheDocument()
  })
  it('Badge marca o tom', () => {
    render(<Badge tone="danger">Atrasado</Badge>)
    expect(screen.getByText('Atrasado')).toHaveAttribute('data-tone', 'danger')
  })
})
