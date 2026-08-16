/**
 * English (Trinidad & Tobago) base dictionary.
 * Keep keys grouped by feature area so it's easy to scan.
 *
 * Conventions:
 *  - Keys are dot-namespaced: `area.subarea.thing`
 *  - Use `{name}` style placeholders that `t()` will replace.
 *  - Casing matches how the string would appear in UI (sentence case for
 *    body copy, Title Case for buttons / headings).
 *
 * Trini vocabulary cheat-sheet (see https://triniinxisle.com/.../trinidad-dictionary/):
 *
 * ALLOWED in product copy — flavorful but family-friendly:
 *  - **lime** (n): a gathering/party/hangout. **to lime** (v): to hang out at one.
 *  - **fete** (n): a (bigger) party.
 *  - **pardners**: friends, buddies (gender-neutral).
 *  - **doudou / doux-doux**: sweetie, term of affection — gender-neutral here.
 *  - **doh**: don't. **yuh**: you/your. **ent**: isn't/didn't (tag).
 *  - **ah / dey / fuh / wit / nah / allyuh**: function words and softeners.
 *  - **donkey years**: a very long time.
 *  - **now for now**: immediately, right this second.
 *  - **just now** (Trini sense): in a little while (NOT immediately) — be careful.
 *  - **wha de scene**: what's up. **hit we d scene**: drop us the news / fill us in.
 *  - **plenty**: a lot. **fadder**: postfix intensifier ("fete fadder").
 *  - **for so / sweet for so**: a lot, very much.
 *  - **hold on small**: one moment.
 *  - **mauvay langue**: gossip/slander — only as a name for a *moderation
 *    category* we act on, never as our voice describing a user.
 *  - **break dew**: stay out late.
 *  - Folklore (for later theming, not voice): Papa Bois, Mama Dlo,
 *    La Diablesse, Soucouyant, Douen.
 *  - Food / culture (for later theming): sancoche, brulejol, doubles,
 *    parang, soca.
 *
 * AVOID in product copy — too coarse, slur-adjacent, sexual, or violent:
 *  - **steups** (audible kiss-teeth — reads as contempt).
 *  - **whey de arse** and any *arse/ass* construction.
 *  - **tonnerre!** as an exclamation (reads as cursing in Creole register).
 *  - **bad john / badjohn** (glamorizes violence).
 *  - **catty-catty, kakalaylay, sweat rice, turtle botheration, xamboula**
 *    (sexual / sexually charged).
 *  - **horn / horning** (adultery — fine in user content, never our voice).
 *  - **buck** as a noun for a person (slur risk).
 *  - **dotish / chupid / chupidness / chupidee / kunumunu / kuyoh** —
 *    these all gloss as "stupid / idiot" in the source dictionary and
 *    are routinely used to insult people. Never put them in our voice,
 *    even self-deprecatingly — a reader who knows the word will hear
 *    "you idiot", not "this form is broken".
 *  - **whey, whey-whey** as an aggressive interjection.
 *
 * Rule of thumb: if you wouldn't print it in a Government of Trinidad &
 * Tobago tourism brochure, it doesn't belong in our system voice. User-
 * generated content is governed by Community Guidelines, not this file.
 */
const dict = {
  // Brand / marketing
  'app.name': 'EudaChat',
  'app.tagline': 'Cohort chat with optional T&T lime',
  'app.loading': 'Hold on small…',
  'app.retry': 'Try again',

  // Auth
  'auth.login': 'Sign in',
  'auth.signup': 'Make an account',
  'auth.signout': 'Sign out',
  'auth.google': 'Continue with Google',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.forgot': 'Forgot your password?',
  'auth.welcomeBack': 'Welcome back, {name} — good to see yuh!',

  // Nav
  'nav.feed': 'Feed',
  'nav.discover': 'Discover',
  'nav.status': 'Status',
  'nav.messages': 'Messages',
  'nav.notifications': 'Notifications',
  'nav.profile': 'Profile',
  'nav.settings': 'Settings',
  'nav.admin': 'Admin',
  'nav.skipToContent': 'Skip to main content',

  // Feed
  'feed.title': 'Feed',
  'feed.empty': 'Quiet for so. Follow some Trinis and come join the lime!',
  'feed.loadMore': 'Load more',
  'feed.refresh': 'Refresh',
  'feed.tabFollowing': 'Following',
  'feed.tabForYou': 'For you',
  'feed.tabLocal': 'Local',

  // Compose
  'compose.placeholder': 'Wha de scene, Trini?',
  'compose.post': 'Post',
  'compose.posting': 'Posting…',
  'compose.tooLong': 'Post is too long. Keep it under {max} characters.',
  'compose.attach': 'Attach photo or video',
  'compose.visibility': 'Who can see this?',

  // Visibility
  'visibility.public': 'Public',
  'visibility.followers': 'Followers',
  'visibility.close_friends': 'Close friends',

  // Reactions
  'reaction.yeah': 'Yeah Yeah',
  'reaction.sweet': 'Sweet for so',
  'reaction.doh': 'Doh study it',

  // Post actions
  'post.like': 'Like',
  'post.unlike': 'Unlike',
  'post.comment': 'Comment',
  'post.repost': 'Repost',
  'post.alreadyReposted': 'You already reposted this',
  'post.delete': 'Delete post',
  'post.report': 'Report post',
  'post.deleted': 'Post deleted',
  'post.reportSubmitted': 'Thanks — we will review this report',

  // Status
  'status.title': 'Your Status',
  'status.encrypted': 'End-to-end encrypted',
  'status.tapToReply': 'Tap to reply privately',
  'status.expires': 'Expires in {hours}h',
  'status.empty': 'No status updates yet today. Hit we d scene!',
  'status.hubIntro':
    'Public statuses last 24h and everybody can see. Close-friends statuses are end-to-end encrypted — only your pardners with a recent device handshake can read.',
  'status.hubEmpty': 'No statuses yet. Drop one and start the lime!',
  'status.composerHint': "Hit we d scene",
  'status.deleteConfirm': 'Delete this status? It go disappear for everybody.',

  // Messages
  'messages.title': 'Messages',
  'messages.encrypted': 'End-to-end encrypted with Signal',
  'messages.placeholder': 'Type a message…',
  'messages.send': 'Send',
  'messages.empty': 'No chats yet. Start one from somebody profile.',
  'messages.deliveryError': 'Could not deliver message',
  'messages.typing': '{name} typing…',
  'messages.read': 'Read',
  'messages.sent': 'Sent',
  'messages.sending': 'Sending…',

  // Notifications
  'notifications.title': 'Notifications',
  'notifications.empty': 'You are all caught up.',
  'notifications.markAllRead': 'Mark all as read',
  'notifications.like': '{name} liked your post',
  'notifications.comment': '{name} commented on your post',
  'notifications.repost': '{name} reposted your post',
  'notifications.follow': '{name} started following you',
  'notifications.message': 'New message from {name}',
  'notifications.mention': '{name} mentioned you',

  // Profile
  'profile.posts': 'Posts',
  'profile.likedPosts': 'Liked posts',
  'profile.resharedPosts': 'Reshared posts',
  'profile.follow': 'Follow',
  'profile.unfollow': 'Unfollow',
  'profile.followers': 'Followers',
  'profile.following': 'Following',
  'profile.editProfile': 'Edit profile',
  'profile.bio': 'Bio',
  'profile.region': 'Region',
  'profile.private': 'This profile is private',

  // Discover
  'discover.title': 'Discover',
  'discover.trendingTags': 'Trending tags',
  'discover.locality': 'Around T&T',
  'discover.suggested': 'Suggested for you',
  'discover.searchPlaceholder': 'Search posts, people, hashtags…',
  'discover.region.all': 'All of T&T',

  // Settings
  'settings.title': 'Settings',
  'settings.account': 'Account',
  'settings.security': 'Security & privacy',
  'settings.notifications': 'Notifications',
  'settings.language': 'Language',
  'settings.privacy': 'Privacy',
  'settings.terms': 'Terms of service',
  'settings.privacyPolicy': 'Privacy policy',
  'settings.deleteAccount': 'Delete account',
  'settings.saved': 'Saved.',
  'settings.savedError': 'Could not save changes.',

  // Errors
  'error.generic': 'Something break, sorry. Try again.',
  'error.network': 'Network error. Check yuh connection.',
  'error.unauthorized': 'Please sign in to continue.',
  'error.notFound': 'We could not find that.',
  'error.suspended': 'Your account is suspended. Contact support.',
  /** Generic validation error — phrased gently, never blames the user. */
  'error.validation': "That doh look right. Check what yuh enter and try again.",

  // Moderation
  'mod.reportReason.spam': 'Spam',
  'mod.reportReason.harassment': 'Harassment or bullying',
  'mod.reportReason.hate': 'Hate speech',
  'mod.reportReason.violence': 'Violence or threats',
  'mod.reportReason.nsfw': 'Adult or sexual content',
  'mod.reportReason.gossip': 'Mauvay langue (gossip / slander)',
  'mod.reportReason.other': 'Other',
  'mod.reportSubmit': 'Submit report',
  'mod.reportCancel': 'Cancel',

  // Time formatting
  'time.justNow': 'just now',
  'time.minutesAgo': '{n}m ago',
  'time.hoursAgo': '{n}h ago',
  'time.daysAgo': '{n}d ago',
  'time.yesterday': 'yesterday',
  /** Very old timestamps — Trini "donkey years" = a very long time. */
  'time.donkeyYears': 'donkey years ago',
} as const;
export default dict;
