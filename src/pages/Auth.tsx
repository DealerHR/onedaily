import { useState } from 'react';
import { SignIn } from './SignIn';
import { SignUp } from './SignUp';

export const Auth = () => {
  const [isSignIn, setIsSignIn] = useState(true);

  return isSignIn ? (
    <SignIn onToggleMode={() => setIsSignIn(false)} />
  ) : (
    <SignUp onToggleMode={() => setIsSignIn(true)} />
  );
};
