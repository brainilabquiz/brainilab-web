// Compatibility exports for existing Knowledge integrations.
import {HOME_CHANNELS,parseChannelFeed,latestChannelVideo,channelVideo} from './youtube-channel.js';
export const KNOWLEDGE_CHANNEL=HOME_CHANNELS.knowledge.id;
export const KNOWLEDGE_URL=HOME_CHANNELS.knowledge.url;
export const parseKnowledgeFeed=xml=>parseChannelFeed(xml,'knowledge');
export const latestKnowledgeVideo=(apiKey,fetcher=fetch)=>latestChannelVideo(apiKey,fetcher,'knowledge');
export const knowledgeVideo=(request,ctx,cache,fetcher=fetch,apiKey='')=>channelVideo(request,ctx,cache,fetcher,apiKey,'knowledge');
