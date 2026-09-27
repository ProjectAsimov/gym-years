import { Sheet } from '../components/Sheet';
import { GoogleButton, LinkButton } from '../components/Button';
import { signIn, markWelcomed } from '../model/session';
import { MOCK } from '../model/api';
import { closeSheet } from '../lib/nav';

export function Welcome({ open }: { open: boolean }) {
  const skip = () => { markWelcomed(); closeSheet(); };
  return (
    <Sheet open={open} onClose={skip} center labelledBy="welcomeTitle">
      <img src={import.meta.env.BASE_URL + 'icon.svg'} alt="" width={56} height={56} />
      <h2 id="welcomeTitle">TaskTracker</h2>
      <p>One square per day, lit on the days you did the thing.</p>
      <p>Sign in so your days follow you to every device. Nothing else is shared.</p>
      <GoogleButton onClick={signIn}>{MOCK ? 'Sign in (mock)' : 'Continue with Google'}</GoogleButton>
      <LinkButton onClick={skip}>Not now</LinkButton>
    </Sheet>
  );
}
