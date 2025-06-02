import './App.css'
import Whiteboard from './components/Whiteboard'

function App() {

  return (
    <div className='min-h-screen bg-gray-800 py-8'>
      <header  className="text-center mb-8">
        <h1 className="text-4xl font-bold text-indigo-600">Ideaboard</h1>
        <p className="text-gray-600">Real-Time Collaborative Whiteboard</p>
      </header>
      <main className="flex flex-col h-screen container mx-auto px-4">
        <Whiteboard />
      </main>
      <footer className="text-center mt-8 text-gray-500">
        Draw together in real-time
      </footer>
    </div>
  )
}

export default App
