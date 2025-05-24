
import React from 'react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="bg-gray-800 p-4 shadow-md sticky top-0 z-10">
      <h1 className="text-2xl font-bold text-center text-cyan-400">{title}</h1>
    </header>
  );
};

export default Header;
