export type Theme = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  logo: React.ComponentType<any>;
};

export const defaultTheme: Theme = {
  primary: 'bg-blue-600',
  secondary: 'bg-purple-600',
  accent: 'bg-emerald-500',
  background: 'bg-gray-50',
  text: 'text-gray-900',
  logo: () => null,
};