/**
 * Content access for the browser app. The curriculum itself lives in
 * shared/curriculum so the mentor server can ground AI answers in it. The app
 * ships the catalog (subjects, lessons and a small topic index) and loads each
 * subject's full topic content on demand.
 */
export * from '../../shared/curriculum/catalog';
export { loadTopicContent, preloadTopicContent, useTopicContent, type TopicContentState } from './topicContent';
