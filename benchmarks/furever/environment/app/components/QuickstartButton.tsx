'use client';

import * as React from 'react';
import {Loader2} from 'lucide-react';
import {generate} from 'random-words';
import {signIn} from 'next-auth/react';
import {ArrowRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useRouter} from 'next/navigation';

const QuickstartButton = () => {
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  const SALON_NAMES = [
    'PawsnPampering',
    'FurryFinesse',
    'ChicCanineCuts',
    'FluffnBuffGrooming',
    'PawPrintsParlour',
    'WhiskerWhisperers',
    'TailWagginTidbits',
    'PlushPawsPampering',
    'DivineDoggyDos',
    'SnipnSpruceSalon',
    'HappyHoundsHub',
    'PurrfectlyPamperedPets',
    'ManeMajestyGrooming',
    'TailsnTanglesSalon',
    'BarknBathBoutique',
    'PetalPawsPalace',
    'FuzzyFinishGrooming',
    'FidosFreshenUp',
    'WhiskerWashGroomingStudio',
    'PawsitivelyPamperedPups',
    'PurrfectionParlour',
    'ClipnCurlCanineCare',
    'ChicPawsSalon',
    'TheGroomingLoft',
    'TailTrendsTrim',
    'PawsnPreenPampering',
    'PlushPupsParlour',
    'DivineDoggyDetails',
    'FluffnBuffBoutique',
    'PawsitivelyPamperedPups',
    'PawPrintsPreening',
    'ChicCanineCreations',
    'TailoredTressesTrim',
    'FurryFriendsFancy',
    'HeavenlyHoundsHideaway',
    'PawsnPolishParlour',
    'DivineDoggyDetails',
    'FluffnTumbleGrooming',
    'PawPrintsPruning',
    'PawsitivelyPoshPups',
    'TailoredTanglesTrim',
    'PawsnPolishPampering',
    'PawsnPreenPalace',
    'FurryFinesseSpa',
    'ChicCanineCuts',
    'FluffnBuffGroomingStudio',
    'PawPrintsParlour',
    'WhiskerWhisperers',
    'TailWagginTidbits',
    'PlushPawsPampering',
    'DivineDoggyDos',
    'SnipnSpruceSalon',
    'HappyHoundsHub',
    'PurrfectlyPamperedPets',
    'ManeMajestyGrooming',
    'TailsnTanglesSalon',
    'BarknBathBoutique',
    'PetalPawsPalace',
    'FuzzyFinishGrooming',
    'FidosFreshenUp',
    'WhiskerWashGroomingStudio',
    'PawsitivelyPamperedPups',
    'PurrfectionParlour',
    'ClipnCurlCanineCare',
    'ChicPawsSalon',
    'TheGroomingLoft',
    'TailTrendsTrim',
    'PawsnPreenPampering',
    'PlushPupsParlour',
    'DivineDoggyDetails',
    'FluffnBuffBoutique',
    'PawsitivelyPamperedPups',
    'PawPrintsPreening',
    'ChicCanineCreations',
    'TailoredTressesTrim',
    'FurryFriendsFancy',
    'HeavenlyHoundsHideaway',
    'PawsnPolishParlour',
    'DivineDoggyDetails',
    'FluffnTumbleGrooming',
    'PawPrintsPruning',
    'PawsitivelyPoshPups',
    'TailoredTanglesTrim',
    'PawsnPolishPampering',
    'PawsomePoochParlour',
    'DivineDoggyDooDads',
    'FluffnStuffSalon',
    'PamperedPawsPalace',
    'PurrfectPawsParlour',
    'TailWaggersTrim',
    'FurryFriendsFiesta',
    'WhiskerWondersWorkshop',
    'DivineDoggyDetailing',
    'PawsitivePampering',
    'ChicCanineCoiffeur',
    'TailTrendyTrim',
    'PurrfectlyPrettyPooches',
    'PlushPamperedPets',
    'PawsnPurrParlour',
    'FuzzyFancyFinishes',
    'PawPrintsPurrfection',
    'BarknStyleSalon',
    'TidyTailsTrim',
    'PawsomePreeningPalace',
    'ChicChumCuts',
    'FurEleganceGrooming',
    'PurrfectPamperPlace',
    'TailTalesTrim',
    'SnipsnSudsSalon',
    'FurryFriendsFest',
    'PawPrintsPamperPalace',
    'HeavenlyHoundsHaven',
    'DivineDoggyDressing',
    'FluffyFurFinishes',
    'PurrfectPawsPlace',
    'PawsitivelyPamperedParlor',
    'ChicCanineCouture',
    'TailoredTressesTrim',
    'FurryFriendsFandango',
    'PawsnPolishPlace',
    'DivineDoggyDazzle',
    'FluffnFurSalon',
    'PamperedPoochParadise',
    'PurrfectionPampering',
    'TailTreatsTrim',
    'FurryFiestaGrooming',
    'PawsnPreenParlor',
    'DivineDoggyDesigns',
    'FluffnFoldFurcare',
    'PawPrintsnPreen',
    'PawsitivelyPlushParlor',
    'TailoredTanglesnTrims',
    'FurryFriendsFrolic',
    'PawsnPamperPlace',
    'DivineDoggyDemeanor',
    'FluffnFancyFur',
    'PamperedPetParlour',
    'PurrfectPamperParadise',
    'TailTidbitsTrim',
    'FurryFriendsFiesta',
    'PawsnPreenPalace',
    'DivineDoggyDressage',
    'FluffnFancyFurcare',
    'PawPrintsPamperParadise',
    'PawsitivelyPlushPalace',
    'TailoredTanglesnPreen',
    'FurryFriendsFantasy',
    'PawsnPreenPalace',
    'DivineDoggyDressUp',
    'FluffnFancyFurcare',
    'PawPrintsPamperParadise',
    'PawsitivelyPlushParadise',
    'TailoredTanglesnPreen',
    'FurryFriendsFantasy',
    'PawsnPreenParadise',
    'DivineDoggyDressUp',
    'FluffnFancyFurcare',
    'PawPrintsPamperParadise',
    'PawsitivelyPlushParadise',
    'TailoredTanglesnPreen',
    'FurryFriendsFantasy',
    'PawsnPreenParadise',
    'DivineDoggyDressUp',
    'FluffnFancyFurcare',
    'PawPrintsPamperParadise',
    'PawsitivelyPlushParadise',
    'TailoredTanglesnPreen',
  ];

  async function handleQuickstartCreation() {
    setLoading(true);
    const emailNumber = Math.floor(Math.random() * 1001);
    const salonName =
      SALON_NAMES[Math.floor(Math.random() * SALON_NAMES.length)];
    const passwordNumber = Math.floor(Math.random() * 90000) + 10000;
    const passwordWords = generate({exactly: 2, minLength: 5, maxLength: 12});

    await signIn('createprefilledaccount', {
      email: `${salonName}_${emailNumber}@furever.com`,
      password: `${passwordWords[0]}-${passwordWords[1]}-${passwordNumber}`,
      businessName: salonName,
      callbackUrl: '/home?shownux=true',
    });

    router.push('/home?shownux=true'); // Redirect to the dashboard
  }

  const onClick = async () => {
    try {
      handleQuickstartCreation();
    } catch (error: any) {
      console.error('An error occurred when signing in', error);
    }
  };

  return (
    <Button
      className="items-center gap-2 text-base font-medium"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? (
        <>
          Creating <Loader2 className="animate-spin" size={20} />
        </>
      ) : (
        <>
          Create quickstart account <ArrowRight size={20} />
        </>
      )}
    </Button>
  );
};

export default QuickstartButton;
