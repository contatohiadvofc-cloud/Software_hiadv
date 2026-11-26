import './site.css'
import { montarSite } from './montar'
import { montarMovimento } from './movimento'
import { montarVariantes } from './variantes'

montarVariantes(document, window)
montarSite(document, window)
montarMovimento(document, window)
