// List of common disposable/burner email domains
// This list should be regularly updated
const disposableEmailDomains = [
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'temp-mail.org',
  'throwaway.email',
  'yopmail.com',
  'tempmail.com',
  'fakeinbox.com',
  'trashmail.com',
  'getnada.com',
  'maildrop.cc',
  'mailnesia.com',
  'mintemail.com',
  'sharklasers.com',
  'spam4.me',
  'tempinbox.com',
  'emailondeck.com',
  'dispostable.com',
  '10minutemail.net',
  'mailcatch.com',
  'mohmal.com',
  'mvrht.com',
  'getairmail.com',
  'fakemailgenerator.com',
  'guerrillamail.biz',
  'guerrillamail.de',
  'guerrillamail.net',
  'guerrillamail.org',
  'grr.la',
  'guerrillamailblock.com',
  'mailexpire.com',
  'mailforspam.com',
  '20minutemail.com',
  '33mail.com',
  'anonbox.net',
  'boxformail.in',
  'buyusedlibrarybooks.org',
  'casualdx.com',
  'deadaddress.com',
  'despam.it',
  'disposemail.com',
  'dodgeit.com',
  'e4ward.com',
  'emailias.com',
  'emailsensei.com',
  'emailtemporar.ro',
  'filzmail.com',
  'getonemail.com',
  'gishpuppy.com',
  'great-host.in',
  'hidemail.de',
  'jetable.org',
  'mailmoat.com',
  'mytemp.email',
  'no-spam.ws',
  'nobulk.com',
  'noclickemail.com',
  'oneoffemail.com',
  'pookmail.com',
  'rejectmail.com',
  'safe-mail.net',
  'selfdestructingmail.com',
  'sneakemail.com',
  'sogetthis.com',
  'spamavert.com',
  'spambox.us',
  'spamex.com',
  'spamfree24.org',
  'spamgourmet.com',
  'spamhole.com',
  'spamify.com',
  'spamslicer.com',
  'spamthisplease.com',
  'supergreatmail.com',
  'teleworm.us',
  'tempemail.net',
  'tempinbox.co.uk',
  'tempomail.fr',
  'temporarily.de',
  'thankyou2010.com',
  'thenthanbuy.com',
  'tmailinator.com',
  'tradermail.info',
  'trash-mail.at',
  'trash-mail.com',
  'trash2009.com',
  'trashdevil.com',
  'trashemail.de',
  'trashymail.com',
  'tyldd.com',
  'wegwerfmail.de',
  'wegwerfmail.net',
  'wegwerfmail.org',
  'wh4f.org',
  'yopmail.fr',
  'yopmail.net',
  'zetmail.com',
  'zippymail.info'
];

/**
 * Check if an email address is from a disposable/burner email provider
 * @param {string} email - Email address to check
 * @returns {boolean} - True if email is disposable, false otherwise
 */
const isDisposableEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Extract domain from email
  const domain = email.toLowerCase().split('@')[1];
  
  if (!domain) {
    return false;
  }

  // Check if domain is in the blocklist
  return disposableEmailDomains.includes(domain);
};

module.exports = {
  isDisposableEmail,
  disposableEmailDomains
};
