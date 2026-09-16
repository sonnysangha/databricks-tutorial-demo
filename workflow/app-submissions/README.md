# App feedback processing

The app notebook reads one saved Lakebase submission, uses the refresh workflow's four stages, publishes to the separate app schema, and writes a completion receipt. It never overwrites team decisions.

Use the [configuration tool and tutorial](../../docs/SETUP.md#8-connect-the-application) to replace the notebook's connection placeholders, schema guard, and experiment path before importing it. Create its job from the generated `app-job.json` and let the app supply a saved submission UUID.

`build_notebook.py` regenerates the unconfigured app template from the main notebook plus `tracing.py.fragment`. After changing shared workflow logic, regenerate, review, run offline tests, and rebuild the starter ZIP. Configuration is applied after generation.
