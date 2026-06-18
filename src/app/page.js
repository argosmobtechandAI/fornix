"use client";

import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { 
  Target, 
  Award, 
  Users, 
  Clock,
  BookOpen,
  CheckCircle
} from "lucide-react";
import { useState, useEffect } from "react";

// Fixed background bubbles with consistent values
const backgroundBubbles = [
  { width: 108, height: 62, left: 41, top: 41 },
  { width: 66, height: 83, left: 97, top: 76 },
  { width: 78, height: 123, left: 61, top: 37 },
  { width: 106, height: 64, left: 89, top: 19 },
  { width: 137, height: 73, left: 51, top: 43 },
  { width: 144, height: 77, left: 99, top: 79 },
  { width: 116, height: 143, left: 81, top: 51 },
  { width: 133, height: 104, left: 79, top: 48 },
  { width: 73, height: 82, left: 1, top: 34 },
  { width: 80, height: 85, left: 20, top: 9 },
  { width: 66, height: 65, left: 63, top: 13 },
  { width: 68, height: 73, left: 61, top: 76 },
  { width: 110, height: 84, left: 33, top: 16 },
  { width: 108, height: 131, left: 25, top: 18 },
  { width: 130, height: 121, left: 57, top: 8 },
  { width: 106, height: 88, left: 44, top: 69 },
  { width: 97, height: 92, left: 74, top: 83 },
  { width: 137, height: 95, left: 19, top: 18 },
  { width: 141, height: 82, left: 5, top: 34 },
  { width: 138, height: 145, left: 21, top: 9 },
];

function AnimatedBackground() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Server-side render with static styles
    return (
      <div className="absolute inset-0">
        {backgroundBubbles.map((bubble, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/10 backdrop-blur-sm"
            style={{
              width: bubble.width,
              height: bubble.height,
              left: `${bubble.left}%`,
              top: `${bubble.top}%`,
            }}
          />
        ))}
      </div>
    );
  }

  // Client-side with animations
  return (
    <div className="absolute inset-0">
      {backgroundBubbles.map((bubble, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/10 backdrop-blur-sm"
          style={{
            width: bubble.width,
            height: bubble.height,
            left: `${bubble.left}%`,
            top: `${bubble.top}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const features = [
    {
      icon: Target,
      title: "Precision Learning",
      description: "Targeted approach to medical education with focused curriculum"
    },
    {
      icon: Award,
      title: "Expert Faculty",
      description: "Learn from experienced medical professionals and educators"
    },
    {
      icon: Users,
      title: "Community Support",
      description: "Join a community of aspiring medical professionals"
    },
    {
      icon: Clock,
      title: "Flexible Schedule",
      description: "Learn at your own pace with 24/7 access to materials"
    }
  ];

  const stats = [
    { number: "95%", label: "Success Rate" },
    { number: "10K+", label: "Students Trained" },
    { number: "50+", label: "Expert Faculty" },
    { number: "15+", label: "Years Experience" }
  ];

  const benefits = [
    "Comprehensive curriculum coverage",
    "Interactive learning modules",
    "Real-time progress tracking",
    "Expert mentorship programs",
    "Career guidance and placement"
  ];

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <AnimatedBackground />

          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/30"
              >
                <BookOpen className="w-10 h-10 text-white" />
              </motion.div>
              
              <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6">
                Fornix <span className="text-amber-200">Medical</span>
              </h1>
              
              <p className="text-xl lg:text-2xl text-amber-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                Excellence in Medical Education and Preparation. 
                <span className="block text-amber-200">Your journey to medical mastery starts here.</span>
              </p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-700 text-white rounded-2xl font-semibold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 backdrop-blur-sm border border-white/20"
                >
                  Explore Courses
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-2xl font-semibold text-lg border border-white/20 hover:bg-white/20 transition-all duration-300"
                >
                  View Results
                </motion.button>
              </motion.div>

              {/* Benefits List */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-4xl mx-auto"
              >
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                    className="flex items-center gap-2 text-amber-100 text-sm"
                  >
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span>{benefit}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center"
            >
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1 h-3 bg-white/50 rounded-full mt-2"
              />
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                Why Choose <span className="text-blue-200">Fornix?</span>
              </h2>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                We provide comprehensive medical preparation with innovative learning methodologies
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all duration-300 group"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-blue-100 leading-relaxed">
                      {feature.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="text-center"
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="text-4xl lg:text-5xl font-bold text-white mb-2"
                  >
                    {stat.number}
                  </motion.div>
                  <div className="text-blue-200 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}