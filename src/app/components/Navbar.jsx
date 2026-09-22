"use client";

import { motion } from "framer-motion";

export default function Navbar() {
  return (
    <motion.nav
      className="navbar"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="logo">
        DIGITAL<span>.</span>
      </div>
      <button className="menu-button">
        MENU
      </button>
    </motion.nav>
  );
}