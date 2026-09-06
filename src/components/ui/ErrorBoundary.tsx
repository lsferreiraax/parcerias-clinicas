import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full border border-red-100">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-red-700 mb-2">Erro na aplicação</h1>
            <p className="text-gray-600 text-sm mb-4">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <pre className="bg-gray-100 rounded-lg p-3 text-xs text-gray-700 overflow-auto mb-4">
              {this.state.error.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#1F3864] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#152744]"
            >
              Recarregar página
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
