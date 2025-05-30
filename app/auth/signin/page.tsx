import { signIn } from "next-auth/react";

export default function SignIn() {
  return (
    <div>
      <h1>Sign in</h1>
      <button onClick={() => signIn("google")}>Sign in with Google</button>
    </div>
  );
}
