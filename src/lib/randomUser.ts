import Chance from 'chance';

// Initialize chance with random seed
const chance = new Chance();

// Interface for a person's basic info
interface PersonInfo {
  firstName: string;
  lastName: string;
  fullName: string;
}

// Generate random person info (name components)
export const generatePersonInfo = (): PersonInfo => {
  const firstName = chance.first();
  const lastName = chance.last();
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`
  };
};

// Generate a random email based on person info
export const generateRandomEmail = (personInfo?: PersonInfo): string => {
  if (!personInfo) {
    personInfo = generatePersonInfo();
  }
  
  const { firstName, lastName } = personInfo;
  const emailFormats = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}@example.com`,
    `${firstName.toLowerCase()[0]}${lastName.toLowerCase()}@example.com`,
    `${firstName.toLowerCase()}@example.com`
  ];
  
  return chance.pickone(emailFormats);
};

// Generate a random full name
export const generateRandomFullName = (personInfo?: PersonInfo): string => {
  if (!personInfo) {
    personInfo = generatePersonInfo();
  }
  return personInfo.fullName;
};

// Generate a random username based on person info
export const generateRandomUsername = (personInfo?: PersonInfo): string => {
  if (!personInfo) {
    personInfo = generatePersonInfo();
  }
  
  const { firstName } = personInfo;
  const randomDigits = chance.string({length: 3, pool: '0123456789'});
  return `${firstName.toLowerCase()}${randomDigits}`;
};

// Generate a random website
export const generateRandomWebsite = (): string => {
  // Create a random website URL
  const domains = ['example.com', 'demo.org', 'sample.net', 'test.io'];
  const prefixes = ['www', 'blog', 'dev', 'app'];
  
  const prefix = chance.pickone(prefixes);
  const domain = chance.pickone(domains);
  
  return `https://${prefix}.${domain}/${chance.word()}`;
};

// Generate a simple password for demo purposes
export const generateSimplePassword = (): string => {
  return 'demo123'; // Keep simple for demo purposes
};

// Generate a complete random user profile with consistent attributes
export const generateRandomUserProfile = () => {
  const personInfo = generatePersonInfo();
  
  return {
    email: generateRandomEmail(personInfo),
    password: generateSimplePassword(),
    fullName: personInfo.fullName,
    username: generateRandomUsername(personInfo),
    website: generateRandomWebsite()
  };
};

// Generate a static but random-looking user profile
// This gives consistent values when needed
export const getStaticRandomProfile = () => {
  return {
    email: 'taylor.morgan@example.com',
    password: 'demo123',
    fullName: 'Taylor Morgan',
    username: 'taylor542',
    website: 'https://dev.example.com/profile'
  };
}; 