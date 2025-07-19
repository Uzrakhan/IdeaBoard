import { Link } from 'react-router-dom';
import IdeaBoard from '../assets/IdeaBoard.png'

const Home: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="py-16 md:py-24 flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 mb-10 md:mb-0">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            Collaborate in <span className="text-indigo-600">Real-Time</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-lg">
            Brainstorm, plan, and create together on a shared digital whiteboard
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <Link 
              to="/create-room" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg text-center transition-colors"
            >
              Create a Room
            </Link>
            <Link 
              to="/features" 
              className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-medium py-3 px-6 rounded-lg text-center transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
        <div className="md:w-1/2 flex justify-center">
          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-80 md:h-96">
            <img src={IdeaBoard} className='rounded-xl'/>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
          Powerful Collaboration Features
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Real-Time Drawing",
              description: "Draw together in real-time with multiple collaborators",
              icon: "✏️"
            },
            {
              title: "Unlimited Boards",
              description: "Create as many boards as you need for your projects",
              icon: "📋"
            },
            {
              title: "Easy Sharing",
              description: "Share rooms with a simple link or invite via email",
              icon: "🔗"
            }
          ].map((feature, index) => (
            <div 
              key={index} 
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-indigo-50 rounded-2xl my-12 p-8">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
          What Our Users Say
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {[
            {
              quote: "IdeaBoard has transformed our remote brainstorming sessions. It's like we're all in the same room!",
              author: "Sarah Johnson",
              role: "Product Manager"
            },
            {
              quote: "The real-time collaboration features saved our team hours of back-and-forth. Highly recommend!",
              author: "Michael Chen",
              role: "Engineering Lead"
            }
          ].map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-white p-6 rounded-xl shadow-sm"
            >
              <p className="text-gray-600 mb-4 italic">"{testimonial.quote}"</p>
              <div className="flex items-center">
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-12 h-12" />
                <div className="ml-4">
                  <p className="font-medium text-gray-800">{testimonial.author}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Ready to Get Started?
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Join thousands of teams already using IdeaBoard to power their collaboration
        </p>
        <Link 
          to="/create-room" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg text-lg inline-block transition-colors"
        >
          Create Your First Room
        </Link>
      </section>
    </div>
  )
}

export default Home