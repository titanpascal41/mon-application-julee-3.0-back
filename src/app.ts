// src/app.ts
interface User {
    name: string;
    age: number;
  }
  
  const justine: User = {
    name: 'Justine',
    age: 23,
  };
  
  function isAdult(user: User): boolean {
    return user.age >= 18;
  }
  
  console.log(`${justine.name} is an adult: ${isAdult(justine)}`);
  