# Sentinel Core — scam message corpus

Labelled training data for Sentinel's on-device scam classifier (`lib/sentinel-core.ts`).

**Format:** `- [scam|ham] (category) message text`
Messages are fictional — no real names, phone numbers, account numbers, or BVNs.
Categories: `bank` (fake bank/BVN alerts), `prize` (prize/lottery), `impersonation`,
`refund` (refund/POS), `romance`, `job`.

## Scam

### Fake bank / BVN alerts
- [scam] (bank) Dear customer your BVN linkage has failed pay the reactivation fee today or your account will be permanently closed
- [scam] (bank) CBN notice your ATM card has been suspended call this number and confirm your card number and OTP to restore access
- [scam] (bank) Your account was accessed from a new device reply with your PIN and card expiry so we can block the intruder
- [scam] (bank) This is your bank fraud desk move your balance to this holding account now while we secure your profile
- [scam] (bank) Final reminder your NIN is not linked to this line dial the code below and enter your banking PIN to verify
- [scam] (bank) Dear valued customer your online banking will expire tonight click the link and re-enter your login details to keep it active

### Prize / lottery
- [scam] (prize) Congratulations your number won 3,000,000 in the Airtel anniversary draw send a processing fee to release your winnings
- [scam] (prize) You have been selected for the Coca-Cola cash reward send your account details and a small activation charge to claim
- [scam] (prize) Your SIM emerged winner in the network mega promo pay the delivery fee for your prize cheque to be dispatched
- [scam] (prize) Winner alert you have won an iPhone and 500k cash confirm by paying the clearance levy before midnight today
- [scam] (prize) Bank promo your account was randomly picked for 1,000,000 reply with your BVN and a token fee to be credited

### Impersonation
- [scam] (impersonation) Hello mummy this is my new number I lost my old phone please send 60,000 to this account and I will explain later
- [scam] (impersonation) Good morning sir it is your pastor I am in a meeting kindly help me buy airtime cards and send the pins urgently
- [scam] (impersonation) Boss I am stuck at the bank the transfer is not going through please send the money to this alternative account now
- [scam] (impersonation) This is your MD send the vendor payment to the new account details below before the office closes today
- [scam] (impersonation) Uncle it is me your nephew I had an accident please send money quickly do not call I cannot talk right now

### Refund / POS
- [scam] (refund) You have a pending refund of 220,000 from the government palliative scheme pay the clearance charge to release it
- [scam] (refund) Our POS wrongly debited you twice reply with your card number and PIN so we can reverse the extra charge
- [scam] (refund) Your failed transaction of 95,000 is ready for reversal confirm with your OTP and a small processing fee
- [scam] (refund) Tax refund approved for your account pay the verification fee to this account to receive your 150,000 refund
- [scam] (refund) We noticed an overpayment on your bill enter your account and PIN on this link to claim your money back

### Romance / job
- [scam] (romance) My darling I have shipped a gift box of cash and gold through a courier the agent needs a delivery fee paid today
- [scam] (romance) I am a widow abroad seeking someone honest to receive my inheritance send your bank login so I can transfer it to you
- [scam] (romance) Sweetheart I am at the airport but customs is holding my luggage please send money to clear it and I will pay you back
- [scam] (job) Work from home data entry earn 180k weekly slots close today pay the onboarding fee now to secure your position
- [scam] (job) You have been shortlisted for a foreign job offer pay the visa processing fee to this account to confirm your slot
- [scam] (job) Congratulations you passed the interview send the training kit fee before Friday to complete your employment
- [scam] (job) Urgent recruitment agents needed pay a small registration fee and start earning commissions from home immediately

## Ham (legitimate)
- [ham] (family) Mummy I have sent the money for the market please check your alert and add a bag of rice
- [ham] (family) I saw your missed call I was in class earlier what did you want to discuss
- [ham] (work) Please send the project report before the standup tomorrow morning thank you
- [ham] (work) The meeting has been moved to 2pm same link as last week see you there
- [ham] (work) Can you resend the invoice the first attachment would not open on my laptop
- [ham] (bank) Your transfer of 5,000 to John was successful your available balance is now 42,300
- [ham] (bank) You have received 20,000 from Ada Okoro on your account today
- [ham] (family) The mechanic said the car will be ready tomorrow the fault was just the alternator
- [ham] (work) Salary has landed check your account so we can plan the weekend
- [ham] (family) Happy birthday brother wishing you long life and good health enjoy your day
- [ham] (work) Reminder team lunch is on Friday at the usual place around 1pm
- [ham] (family) I have reached home safely the traffic was light today talk later
