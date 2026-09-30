import { test as teardown } from '@playwright/test'
import { apagarSessao } from '../../helpers/login'

teardown('apaga a sessão gravada do financeiro', async () => { apagarSessao('financeiro') })
