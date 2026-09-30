import { test as setup } from '../../fixtures'
import { garantirProducao } from '../../helpers/bundle'
import { logarEGravar } from '../../helpers/login'

// Modo serial: se a trava falhar, o login nem começa.
setup.describe.configure({ mode: 'serial' })

setup('trava: o ambiente testado é a produção (nunca staging)', async () => {
  await garantirProducao()
})

setup('login: admin (só POST /auth/v1/token)', async ({ page }) => {
  await logarEGravar(page, 'admin')
})
