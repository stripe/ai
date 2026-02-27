import React from 'react';
import {OfferState} from './types';
import {CreateFlexLoanButton} from './CreateFlexLoanButton';
import {LoaderCircle} from 'lucide-react';
import {TransitionFinancingButton} from './TransitionFinancingButton';

export default function ManageFinancing({classes}: {classes?: string}) {
  const [loading, setLoading] = React.useState(true);
  const [offerState, setOfferState] = React.useState<OfferState | undefined>(
    undefined
  );

  const response = React.useCallback(() => {
    if (offerState === undefined) {
      fetch('/api/capital/get_financing_offer', {
        method: 'get',
      })
        .then(async (res) => {
          const status = (await res.json()).offer?.status;
          setOfferState(status || 'no_offer');
        })
        .catch(async (err) => {
          // Handle errors on the client side here
          console.warn('An error occurred: ', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [offerState]);
  response();

  if (!offerState && !loading) {
    return undefined;
  }

  return (
    <>
      {!loading && offerState && (
        <>
          <CreateFlexLoanButton
            classes={classes}
            offerState={offerState}
            visibleForOfferStates={[
              'canceled',
              'completed',
              'expired',
              'fully_repaid',
              'rejected',
              'revoked',
              'no_offer',
            ]}
          />

          <TransitionFinancingButton
            label={'Expire financing offer'}
            fetchUrl="/api/capital/expire_test_financing"
            visibleForOfferStates={['delivered']}
            offerState={offerState}
            classes={classes}
          />

          <TransitionFinancingButton
            label={'Approve financing application'}
            fetchUrl="/api/capital/approve_test_financing"
            visibleForOfferStates={['accepted']}
            offerState={offerState}
            classes={classes}
          />
          <TransitionFinancingButton
            label={'Reject financing application'}
            fetchUrl="/api/capital/reject_test_financing"
            visibleForOfferStates={['accepted']}
            offerState={offerState}
            classes={classes}
          />

          <TransitionFinancingButton
            label={'Fully repay financing'}
            fetchUrl="/api/capital/fully_repay_test_financing"
            visibleForOfferStates={['paid_out']}
            offerState={offerState}
            classes={classes}
          />
        </>
      )}
    </>
  );
}
