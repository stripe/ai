import {Button} from '@/components/ui/button';
import Image from 'next/image';
import Container from '@/app/components/Container';
import pets from '@/app/data/pets.json';

import {
  Plus as PlusIcon,
  Phone as PhoneIcon,
  Mail as EmailIcon,
} from 'lucide-react';

const shuffle = (array: object[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
};

export default function Pets() {
  shuffle(pets);

  return (
    <>
      <div className="flex">
        <h1 className="flex-1 text-3xl font-bold">Pets</h1>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {pets.map((pet, key) => {
          return (
            <Container
              className="relative flex cursor-pointer flex-col items-center gap-4 overflow-hidden transition duration-200 hover:scale-[1.01] hover:shadow-lg"
              key={key}
            >
              <Image
                className="relative h-32 w-full rounded-lg border object-cover md:h-52"
                fill
                quality={80}
                src={`/pet_photos/${pet.profilePhoto}.jpg`}
                sizes="(max-width: 768px) 50vw, 400px"
                alt={`Photo of ${pet.name}`}
                priority
              />
              <div className="flex w-full flex-col gap-4 md:flex-row md:items-center">
                <div className="flex-1">
                  <h3 className="text-lg font-medium">{pet.name}</h3>
                  <p className="text-sm text-subdued">Joined {pet.date}</p>
                </div>
                <div className="flex gap-5">
                  <PhoneIcon size={24} color="var(--accent)" />
                  <EmailIcon size={24} color="var(--accent)" />
                </div>
              </div>
            </Container>
          );
        })}
      </div>
    </>
  );
}
