import 'dotenv/config';
import { hashSync } from 'bcryptjs';
import {
  Category,
  PrismaClient,
  RequestStatus,
  Role,
  Urgency,
} from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL must be configured before running the seed.');
}

function getSeedPassword() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error(
      'Set SEED_PASSWORD to a development password of at least 12 characters.',
    );
  }

  return password;
}
const seedPassword = getSeedPassword();

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const bloodGroups = [
  'O_POSITIVE',
  'A_POSITIVE',
  'B_POSITIVE',
  'AB_POSITIVE',
  'O_NEGATIVE',
];
const categories = Object.values(Category);
const locations = Array.from({ length: 20 }, (_, index) => ({
  lat: 12.9 + (index % 5) * 0.04,
  lng: 77.5 + Math.floor(index / 5) * 0.04,
}));

const organizations = [
  { name: 'DEMO Sample General Hospital 01', type: 'HOSPITAL' },
  { name: 'DEMO Sample City Hospital 02', type: 'HOSPITAL' },
  { name: 'DEMO Sample Community Hospital 03', type: 'HOSPITAL' },
  { name: 'DEMO Sample Blood Bank 04', type: 'BLOOD_BANK' },
  { name: 'DEMO Sample Blood Bank 05', type: 'BLOOD_BANK' },
  { name: 'DEMO Sample Blood Bank 06', type: 'BLOOD_BANK' },
  { name: 'DEMO Sample Pharmacy 07', type: 'PHARMACY' },
  { name: 'DEMO Sample Pharmacy 08', type: 'PHARMACY' },
  { name: 'DEMO Sample Ambulance Service 09', type: 'AMBULANCE' },
  { name: 'DEMO Sample Ambulance Service 10', type: 'AMBULANCE' },
] as const;

const requests = [
  {
    category: Category.BLOOD,
    urgency: Urgency.CRITICAL,
    title: 'Urgent O+ blood donor needed',
    bloodGroup: bloodGroups[0],
    units: 2,
  },
  {
    category: Category.OXYGEN,
    urgency: Urgency.HIGH,
    title: 'Oxygen cylinder refill needed',
  },
  {
    category: Category.AMBULANCE,
    urgency: Urgency.CRITICAL,
    title: 'Ambulance transport needed',
  },
  {
    category: Category.HOSPITAL_BED,
    urgency: Urgency.NORMAL,
    title: 'Hospital bed availability needed',
  },
  {
    category: Category.MEDICINE,
    urgency: Urgency.HIGH,
    title: 'Prescription medicine needed',
  },
  {
    category: Category.OTHER,
    urgency: Urgency.NORMAL,
    title: 'Mobility assistance requested',
  },
  {
    category: Category.BLOOD,
    urgency: Urgency.HIGH,
    title: 'A+ blood donors requested',
    bloodGroup: bloodGroups[1],
    units: 1,
  },
  {
    category: Category.OXYGEN,
    urgency: Urgency.CRITICAL,
    title: 'Oxygen support needed today',
  },
  {
    category: Category.AMBULANCE,
    urgency: Urgency.NORMAL,
    title: 'Scheduled patient transport',
  },
  {
    category: Category.HOSPITAL_BED,
    urgency: Urgency.CRITICAL,
    title: 'Critical care bed needed',
  },
  {
    category: Category.MEDICINE,
    urgency: Urgency.NORMAL,
    title: 'Insulin supply needed',
  },
  {
    category: Category.OTHER,
    urgency: Urgency.HIGH,
    title: 'Emergency meal delivery requested',
  },
  {
    category: Category.BLOOD,
    urgency: Urgency.NORMAL,
    title: 'B- blood donor needed',
    bloodGroup: bloodGroups[2],
    units: 1,
  },
  {
    category: Category.OXYGEN,
    urgency: Urgency.HIGH,
    title: 'Portable oxygen support requested',
  },
  {
    category: Category.AMBULANCE,
    urgency: Urgency.CRITICAL,
    title: 'Urgent hospital transfer needed',
  },
] as const;

const statuses = [
  RequestStatus.OPEN,
  RequestStatus.ACCEPTED,
  RequestStatus.FULFILLED,
  RequestStatus.CANCELLED,
  RequestStatus.EXPIRED,
] as const;

async function main() {
  const passwordHash = hashSync(seedPassword, 12);

  await prisma.user.upsert({
    where: { email: 'admin@lifeline.local' },
    update: { name: 'LifeLine Demo Admin', role: Role.ADMIN, passwordHash },
    create: {
      name: 'LifeLine Demo Admin',
      email: 'admin@lifeline.local',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const helperEmails: string[] = [];
  for (let index = 0; index < locations.length; index += 1) {
    const number = String(index + 1).padStart(2, '0');
    const email = `helper-${number}@lifeline.local`;
    const location = locations[index];
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: `Demo Helper ${number}`,
        phone: '+91-00000-00000',
        role: Role.HELPER,
        isHelper: true,
        passwordHash,
      },
      create: {
        name: `Demo Helper ${number}`,
        email,
        phone: '+91-00000-00000',
        role: Role.HELPER,
        isHelper: true,
        passwordHash,
      },
    });
    helperEmails.push(user.email);

    await prisma.helperProfile.upsert({
      where: { userId: user.id },
      update: {
        offerings: [categories[index % categories.length]],
        bloodGroup: bloodGroups[index % bloodGroups.length],
        lat: location.lat,
        lng: location.lng,
        isAvailable: index % 5 !== 0,
        radiusKm: 5 + (index % 4) * 5,
      },
      create: {
        userId: user.id,
        offerings: [categories[index % categories.length]],
        bloodGroup: bloodGroups[index % bloodGroups.length],
        lat: location.lat,
        lng: location.lng,
        isAvailable: index % 5 !== 0,
        radiusKm: 5 + (index % 4) * 5,
        availableFrom: '08:00',
        availableTo: '20:00',
      },
    });
  }

  for (let index = 0; index < organizations.length; index += 1) {
    const number = String(index + 1).padStart(2, '0');
    const email = `organization-${number}@lifeline.local`;
    const organization = organizations[index];
    const location = locations[(index * 2) % locations.length];
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: organization.name,
        phone: '+91-00000-00000',
        role: Role.ORGANIZATION,
        passwordHash,
      },
      create: {
        name: organization.name,
        email,
        phone: '+91-00000-00000',
        role: Role.ORGANIZATION,
        passwordHash,
      },
    });

    await prisma.organization.upsert({
      where: { userId: user.id },
      update: {
        name: organization.name,
        type: organization.type,
        address: `Demo address ${number}, Bengaluru, Karnataka`,
        lat: location.lat,
        lng: location.lng,
        phone: '+91-00000-00000',
        isVerified: false,
        openHours: '24/7',
      },
      create: {
        userId: user.id,
        name: organization.name,
        type: organization.type,
        address: `Demo address ${number}, Bengaluru, Karnataka`,
        lat: location.lat,
        lng: location.lng,
        phone: '+91-00000-00000',
        isVerified: false,
        openHours: '24/7',
        stock: { note: 'Demo data only; confirm availability directly.' },
      },
    });
  }

  for (let index = 0; index < requests.length; index += 1) {
    const sample = requests[index];
    const status = statuses[index % statuses.length];
    const location = locations[(index * 3) % locations.length];
    const id = `lifeline-demo-request-${String(index + 1).padStart(2, '0')}`;
    const neededBy = new Date(Date.now() + (index + 1) * 60 * 60 * 1000);
    const fulfilledAt = status === RequestStatus.FULFILLED ? new Date() : null;

    await prisma.request.upsert({
      where: { id },
      update: {
        requester: {
          connect: { email: helperEmails[index % helperEmails.length] },
        },
        category: sample.category,
        urgency: sample.urgency,
        title: sample.title,
        details: { note: 'Fictional seed data for local development.' },
        bloodGroup: 'bloodGroup' in sample ? sample.bloodGroup : null,
        units: 'units' in sample ? sample.units : null,
        lat: location.lat,
        lng: location.lng,
        addressText: `Demo location ${index + 1}, Bengaluru, Karnataka`,
        neededBy,
        status,
        fulfilledAt,
      },
      create: {
        id,
        requester: {
          connect: { email: helperEmails[index % helperEmails.length] },
        },
        category: sample.category,
        urgency: sample.urgency,
        title: sample.title,
        details: { note: 'Fictional seed data for local development.' },
        bloodGroup: 'bloodGroup' in sample ? sample.bloodGroup : null,
        units: 'units' in sample ? sample.units : null,
        lat: location.lat,
        lng: location.lng,
        addressText: `Demo location ${index + 1}, Bengaluru, Karnataka`,
        neededBy,
        status,
        fulfilledAt,
      },
    });
  }

  console.info(
    'Seeded 1 admin, 20 helpers, 10 demo organizations, and 15 requests.',
  );
}

main().finally(() => prisma.$disconnect());
