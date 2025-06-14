import Footer from './Footer';
import Header from './Header';
import Whiteboard from './Whiteboard';

const Home = () => {
  return (
    <div className='min-h-screen bg-gray-800 py-8'>
      <Header />
      <main className="flex flex-col h-screen container mx-auto px-4">
        <Whiteboard />
      </main>
      <Footer />
    </div>
  )
}

export default Home