import { Link } from 'react-router-dom';
import { MentorAvatar } from '../components/mentor/MentorAvatar';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="grid min-h-[70dvh] place-items-center p-6">
      <div className="max-w-md text-center">
        <div className="flex justify-center">
          <MentorAvatar variant="full" size={150} mood="thinking" />
        </div>
        <h1 className="mt-4 text-3xl font-semibold">Hmm, this path is empty</h1>
        <p className="mt-2 text-ink-soft">We couldn't find that page. Let's get you back on the map.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/home" className="btn btn-primary">
            Go home
          </Link>
          <Link to="/subjects" className="btn btn-secondary">
            Subjects
          </Link>
        </div>
      </div>
    </div>
  );
}
