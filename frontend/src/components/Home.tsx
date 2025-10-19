import { motion, type TargetAndTransition } from 'framer-motion';
import { Sparkles, Zap, Users, Palette, Code, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = () => {

  const navigate = useNavigate();

  const handleCreateRoom = () => {
    navigate('/create-room');
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 60 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0, 0, 0.2, 1] }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const scaleIn = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.5 }
  };

  const floatingAnimation = {
    y: [0, -20, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  } as TargetAndTransition;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 overflow-hidden bg-white">
      {/* Hero Section with Gradient Background */}
      <section className="relative py-20 md:py-32">
        {/* Animated Background Elements */}
        <motion.div 
          className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-br from-violet-400/20 to-fuchsia-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: [0.42, 0, 0.58, 1]
          }}
        />
        <motion.div 
          className="absolute bottom-10 left-10 w-96 h-96 bg-gradient-to-tr from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: [0.42, 0, 0.58, 1],
            delay: 1
          }}
        />

        <div className="relative flex flex-col md:flex-row items-center gap-12">
          <motion.div 
            className="md:w-1/2 z-10"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-medium bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                Powered by Modern Web Tech
              </span>
            </motion.div>

            <motion.h1 
              variants={fadeInUp}
              className="text-5xl md:text-7xl font-bold mb-6"
            >
              <span className="bg-gradient-to-r from-slate-900 via-violet-800 to-slate-900 bg-clip-text text-transparent">
                Collaborate in
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 bg-clip-text text-transparent">
                Real-Time
              </span>
            </motion.h1>

            <motion.p 
              variants={fadeInUp}
              className="text-xl text-slate-600 mb-8 max-w-lg leading-relaxed"
            >
              Experience seamless collaboration with a beautifully crafted digital whiteboard. Built with cutting-edge frontend technologies.
            </motion.p>

            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4"
            >
              <button onClick={handleCreateRoom} className="group relative bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold py-4 px-8 rounded-xl text-center transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/50 hover:scale-105">
                <span className="relative z-10">Create a Room</span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-violet-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </button>
              <button className="group border-2 border-slate-300 text-slate-700 hover:border-violet-600 hover:text-violet-600 font-semibold py-4 px-8 rounded-xl text-center transition-all duration-300 hover:shadow-md hover:scale-105 bg-white/50 backdrop-blur-sm">
                Explore Features
              </button>
            </motion.div>

            {/* Tech Stack Badges */}
            <motion.div 
              variants={fadeInUp}
              className="flex flex-wrap gap-3 mt-8"
            >
              {['React', 'TypeScript', 'Framer Motion', 'Tailwind'].map((tech, i) => (
                <motion.span
                  key={tech}
                  className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full border border-slate-200"
                  whileHover={{ scale: 1.1, backgroundColor: '#f1f5f9' }}
                  transition={{ delay: i * 0.1 }}
                >
                  {tech}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div 
            className="md:w-1/2 flex justify-center relative"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <motion.div 
              className="relative w-full max-w-lg"
              animate={floatingAnimation}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 rounded-2xl blur-2xl" />
              <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl shadow-2xl border border-slate-200/50 w-full h-80 flex items-center justify-center">
                <div className="text-center p-8">
                  <Palette className="w-16 h-16 mx-auto mb-4 text-violet-600" />
                  <p className="text-slate-600 font-medium">Your IdeaBoard Preview</p>
                </div>
              </div>
              {/* Decorative Elements */}
              <motion.div
                className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl opacity-80"
                animate={{ rotate: [0, 180, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: [0.4, 0, 0.2, 1]  }}
              />
              <motion.div
                className="absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-br from-fuchsia-400 to-violet-500 rounded-full opacity-80"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: [0.42, 0, 0.58, 1] }}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20" id="features">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-4">
            Powerful Collaboration Features
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Everything you need for seamless team collaboration, beautifully designed
          </p>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {[
            {
              title: "Real-Time Drawing",
              description: "Draw together with zero latency. Watch ideas come to life as your team collaborates seamlessly.",
              icon: Palette,
              gradient: "from-violet-500 to-purple-500"
            },
            {
              title: "Infinite Canvas",
              description: "No limits to your creativity. Scale your boards infinitely and organize ideas effortlessly.",
              icon: Layers,
              gradient: "from-cyan-500 to-blue-500"
            },
            {
              title: "Instant Sharing",
              description: "Share with a click. Invite collaborators via link or email and start working together instantly.",
              icon: Zap,
              gradient: "from-fuchsia-500 to-pink-500"
            }
          ].map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <motion.div 
                key={index}
                variants={scaleIn}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="group relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200/50 overflow-hidden"
              >
                <motion.div 
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                />
                <div className={`relative inline-flex p-4 bg-gradient-to-br ${feature.gradient} rounded-2xl mb-6 shadow-lg`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Developer Showcase */}
      <motion.section 
        className="py-20 my-16 relative"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-violet-50 rounded-3xl" />
        <div className="relative p-12">
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="inline-flex p-4 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl mb-6"
            >
              <Code className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-4">
              Crafted with Modern Tech
            </h2>
            <p className="text-slate-600 text-lg max-w-3xl mx-auto">
              Built by a passionate frontend developer using the latest web technologies. 
              Every animation, interaction, and pixel is thoughtfully designed.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { name: 'React 18', icon: '⚛️' },
              { name: 'TypeScript', icon: '📘' },
              { name: 'Framer Motion', icon: '🎬' },
              { name: 'Tailwind CSS', icon: '🎨' }
            ].map((tech, i) => (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.05 }}
                className="bg-white p-6 rounded-xl shadow-md text-center border border-slate-200/50"
              >
                <div className="text-4xl mb-3">{tech.icon}</div>
                <p className="font-semibold text-slate-800">{tech.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        className="py-20 text-center relative"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-3xl opacity-95" />
        <div className="relative p-16 text-white">
          <motion.div
            initial={{ scale: 0.8 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 150 }}
          >
            <Users className="w-16 h-16 mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-10 max-w-2xl mx-auto opacity-90">
              Join thousands of teams already using IdeaBoard to power their collaboration
            </p>
            <button onClick={handleCreateRoom} className="inline-block bg-white text-violet-600 font-bold py-4 px-10 rounded-xl text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl">
              Create Your First Room
            </button>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
};

export default Home;