import { test as teardown } from '@playwright/test'
import { apagarSessao } from '../../helpers/login'

// Apaga o storageState (token real) ao fim da rodada. Não chama /auth/v1/logout de propósito:
// o logout do Supabase é global e derrubaria as outras sessões do usuário real.
teardown('apaga a sessão gravada do admin', async () => { apagarSessao('admin') })
