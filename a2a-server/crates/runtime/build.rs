// build.rs — required by napi-build to generate the correct .node bindings
extern crate napi_build;
fn main() {
    napi_build::setup();
}
