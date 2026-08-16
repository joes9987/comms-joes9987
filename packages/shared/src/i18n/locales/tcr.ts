/**
 * Trinidadian Creole (TCR) localisation. Best-effort, written to feel
 * natural in everyday Trini conversation while staying readable for
 * folks who default to English. Community contributions very welcome —
 * please keep the same key set as `en-TT.ts`.
 *
 * Style notes:
 *  - Prefer "yuh" over "you", "doh" over "don't", "fuh" over "for", "ah"
 *    over "a/an", "ent" for "isn't/didn't", "go" for "will".
 *  - Use "lime" naturally — in T&T a *lime* is a gathering/party, and "to
 *    lime" means to hang out at one ("Lewwe lime dey", "Time to lime").
 *    Don't say things like "lime in" — say "join the lime" or "come and lime".
 *  - "doudou" / "doux-doux" is an affectionate term — fine for friendly
 *    copy but avoid in serious or admin contexts.
 *  - "fete" = (bigger) party. "pardners" = friends/buddies.
 *  - "now for now" = right this second. "just now" = in a little while
 *    (the *opposite* of standard English — careful with that one).
 *  - "donkey years" = a very long time.
 *  - "mauvay langue" = gossip/slander — moderation category only.
 *  - "wha de scene" = what's up. "hit we d scene" = fill us in.
 *  - Don't translate proper nouns ("Lime", "Trinidad & Tobago", "Signal").
 *
 * AVOID in product copy (same list as en-TT.ts — see that file's header
 * for the full reasoning):
 *  - steups, whey de arse / arse-anything, tonnerre! as exclamation,
 *    bad john, catty-catty, kakalaylay, sweat rice, horn/horning, buck
 *    (as noun for a person), and the whole "stupid/idiot" family:
 *    **dotish, chupid, chupidness, chupidee, kunumunu, kuyoh**.
 *
 * Rule of thumb: if you wouldn't print it in a tourism brochure, it
 * doesn't belong in our system voice. User-generated content is
 * governed by Community Guidelines, not this file.
 *
 *  - Reference: https://triniinxisle.com/2018/06/30/trinidad-dictionary/
 */
const dict = {
  // Brand / marketing
  'app.name': 'EudaChat',
  'app.tagline': 'Cohort chat wit optional T&T lime',
  'app.loading': 'Hold on small…',
  'app.retry': 'Try again',

  // Auth
  'auth.login': 'Sign in',
  'auth.signup': 'Make ah account',
  'auth.signout': 'Log out',
  'auth.google': 'Continue wit Google',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.forgot': 'Forget yuh password?',
  'auth.welcomeBack': 'Welcome back, {name}! Good to see yuh.',

  // Nav
  'nav.feed': 'Feed',
  'nav.discover': 'Look around',
  'nav.status': 'Status',
  'nav.messages': 'Messages',
  'nav.notifications': 'Notifications',
  'nav.profile': 'Profile',
  'nav.settings': 'Settings',
  'nav.admin': 'Admin',
  'nav.skipToContent': 'Skip straight to de content',

  // Feed
  'feed.title': 'Feed',
  'feed.empty': 'Quiet fuh so. Follow some Trinis and come join d lime nah!',
  'feed.loadMore': 'Show more',
  'feed.refresh': 'Refresh',
  'feed.tabFollowing': 'Following',
  'feed.tabForYou': 'Fuh yuh',
  'feed.tabLocal': 'Local',

  // Compose
  'compose.placeholder': 'Wha de scene, Trini?',
  'compose.post': 'Post',
  'compose.posting': 'Sending now for now…',
  'compose.tooLong': 'Yuh post too long. Keep it under {max} characters nah.',
  'compose.attach': 'Add ah picture or video',
  'compose.visibility': 'Who go see dis?',

  // Visibility
  'visibility.public': 'Public',
  'visibility.followers': 'Followers',
  'visibility.close_friends': 'Close pardners',

  // Reactions
  'reaction.yeah': 'Yeah Yeah!',
  'reaction.sweet': 'Sweet fuh so',
  'reaction.doh': 'Doh study it',

  // Post actions
  'post.like': 'Like',
  'post.unlike': 'Unlike',
  'post.comment': 'Talk back',
  'post.repost': 'Repost',
  'post.alreadyReposted': 'Yuh already reposted dat one',
  'post.delete': 'Delete dis post',
  'post.report': 'Report dis post',
  'post.deleted': 'Post gone',
  'post.reportSubmitted': 'Tanks — we go check it out',

  // Status
  'status.title': 'Yuh Status',
  'status.encrypted': 'Lock down tight',
  'status.tapToReply': 'Tap to reply private',
  'status.expires': 'Done in {hours}h',
  'status.empty': 'No status yet today. Hit we d scene!',
  'status.hubIntro':
    'Public statuses last 24h and everybody could see. Close-pardners statuses lock up tight — only yuh pardners wit ah recent device handshake go read.',
  'status.hubEmpty': 'No statuses yet. Drop one and start d lime nah!',
  'status.composerHint': 'Hit we d scene',
  'status.deleteConfirm': 'Delete dis status? It go disappear fuh everybody.',

  // Messages
  'messages.title': 'Messages',
  'messages.encrypted': 'Lock up tight wit Signal',
  'messages.placeholder': 'Type ah message…',
  'messages.send': 'Send',
  'messages.empty': 'No chats yet. Start one from somebody profile.',
  'messages.deliveryError': 'Could not send dat',
  'messages.typing': '{name} typing…',
  'messages.read': 'Read',
  'messages.sent': 'Sent',
  'messages.sending': 'Sending…',

  // Notifications
  'notifications.title': 'Notifications',
  'notifications.empty': 'Yuh all caught up.',
  'notifications.markAllRead': 'Mark all as read',
  'notifications.like': '{name} liked yuh post',
  'notifications.comment': '{name} talk back on yuh post',
  'notifications.repost': '{name} reposted yuh post',
  'notifications.follow': '{name} start following yuh',
  'notifications.message': 'New message from {name}',
  'notifications.mention': '{name} call yuh out',

  // Profile
  'profile.posts': 'Posts',
  'profile.likedPosts': 'Liked posts',
  'profile.resharedPosts': 'Reshared posts',
  'profile.follow': 'Follow',
  'profile.unfollow': 'Stop follow',
  'profile.followers': 'Followers',
  'profile.following': 'Following',
  'profile.editProfile': 'Edit yuh profile',
  'profile.bio': 'Bio',
  'profile.region': 'Where yuh from',
  'profile.private': 'Dis profile private',

  // Discover
  'discover.title': 'Look around',
  'discover.trendingTags': 'Trending tags',
  'discover.locality': 'Around T&T',
  'discover.suggested': 'Suggested fuh yuh',
  'discover.searchPlaceholder': 'Search posts, people, hashtags…',
  'discover.region.all': 'All ah T&T',

  // Settings
  'settings.title': 'Settings',
  'settings.account': 'Account',
  'settings.security': 'Security & privacy',
  'settings.notifications': 'Notifications',
  'settings.language': 'Language',
  'settings.privacy': 'Privacy',
  'settings.terms': 'Terms of service',
  'settings.privacyPolicy': 'Privacy policy',
  'settings.deleteAccount': 'Delete yuh account',
  'settings.saved': 'Save.',
  'settings.savedError': 'Could not save dat.',

  // Errors
  'error.generic': 'Something break, sorry. Try again nah.',
  'error.network': 'Network problem. Check yuh connection.',
  'error.unauthorized': 'Sign in first nah.',
  'error.notFound': 'We cyah find dat.',
  'error.suspended': 'Yuh account get suspend. Reach out to support.',
  'error.validation': "Dat doh look right at all. Check what yuh enter and try again.",

  // Moderation
  'mod.reportReason.spam': 'Spam',
  'mod.reportReason.harassment': 'Harassment or bullying',
  'mod.reportReason.hate': 'Hate talk',
  'mod.reportReason.violence': 'Violence or threats',
  'mod.reportReason.nsfw': 'Adult or sexual content',
  'mod.reportReason.gossip': 'Mauvay langue (gossip)',
  'mod.reportReason.other': 'Something else',
  'mod.reportSubmit': 'Send report',
  'mod.reportCancel': 'Cancel',

  // Time
  // Note: in Trini speech "just now" means "in a little while", so we keep
  // the standard-English meaning here ("a moment ago") but spell it
  // "now-now" to nudge the right reading.
  'time.justNow': 'now-now',
  'time.minutesAgo': '{n}m ago',
  'time.hoursAgo': '{n}h ago',
  'time.daysAgo': '{n}d ago',
  'time.yesterday': 'yesterday',
  'time.donkeyYears': 'donkey years',
};
export default dict;
