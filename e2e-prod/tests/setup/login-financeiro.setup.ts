import { test as setup } from '../../fixtures'
import { garantirProducao } from '../../helpers/bundle'
import { logarEGravar } from '../../helpers/login'

setup.describe.configure({ mode: 'serial' })

setup('trava: o ambiente testado é a produção (nunca staging)', async () => {
  await garantirProducao()
})

setup('login: financeiro (só POST /auth/v1/token)', async ({ page }) => {
  await logarEGravar(page, 'financeiro')
})
