SELECT source, feedback_id, user_id, message_text, timestamp,
       category, issue_cat, issue_type, sentiment, confidence_score,
       explanation, uncertain_classification,
       CASE WHEN user_id IS NULL OR trim(user_id) = '' THEN NULL
            ELSE to_json(named_struct('source', source, 'user_id', user_id)) END AS source_user_key,
       CASE WHEN (coalesce(uncertain_classification, false) OR confidence_score IS NULL OR confidence_score < 0.7 OR explanation IS NULL OR trim(explanation) = '') THEN 1 ELSE 0 END AS needs_review,
       CASE WHEN (coalesce(uncertain_classification, false) OR confidence_score IS NULL OR confidence_score < 0.7 OR explanation IS NULL OR trim(explanation) = '') THEN 'Needs review' ELSE 'Not flagged' END AS review_status
FROM feedback_with_issue_type
ORDER BY timestamp DESC, source, feedback_id
