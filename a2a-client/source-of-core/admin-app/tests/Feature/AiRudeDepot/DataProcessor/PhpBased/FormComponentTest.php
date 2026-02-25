<?php

namespace Tests\Feature\AiRudeDepot\Modificators\PhpBased;

use App\AiRudeDepot\Processors\DataProcessor\Php\WalkForForms as FormComponent;
use App\AiRudeDepot\Storage\DataHub as StaticStorage;
use App\AiRudeDepot\Storage\DataHub;
use Tests\TestCase;
use Illuminate\Support\Facades\Log;
use App\AiRudeDepot\Processors\DataProcessor;
use Illuminate\Support\Facades\Storage;

class FormComponentTest extends TestCase
{
    protected bool $allowDebug = false;
    protected bool $allowVerbosity = false;
    // Add properties to hold DataHub instance from setUp
    protected \App\AiRudeDepot\Storage\DataHub $storage;

    protected function setUp(): void
    {
        parent::setUp();

        // --- Add dynamic disk configuration (copied from ModificatorsTest) ---
        $aiTestBasePath = storage_path('aiTest'); // Define base path for aiTest disk
        config([
            'filesystems.disks.aiTest' => [
                'driver' => 'local',
                'root' => $aiTestBasePath,
                'url' => null,
                'visibility' => 'private',
                'throw' => false,
            ]
        ]);
        // Ensure the directory exists for the aiTest disk after configuring it
        if (!is_dir($aiTestBasePath)) {
            mkdir($aiTestBasePath, 0755, true);
        }
        // --- End dynamic disk configuration ---

        // Forget the disk if it was already resolved so it picks up new config
        Storage::forgetDisk('aiTest');

        $this->storage = new DataHub('aiTest');

        // Use the instance property for saving test data
        $this->storage->address('file!test/simple_assoc')->set(['key' => 'value', 'another' => 123])->save();

        $this->storage->address('module1/data/form1')->set(['initial' => 'value1', 'field2' => 'abc'])->save();
        $this->storage->address('module1/data/nestedForm')->set(['user' => ['name' => 'initialUser', 'email' => '']])->save();
        $this->storage->address('module1/data/conflictingForm')->set(['field2' => 'xyz', 'newField' => 'new'])->save();
        // Remove unrelated data save - not relevant to form component testing
        // $testStorage->address('module1/otherData')->set(['unrelated' => 'info'])->save();
    }

    protected function tearDown(): void
    {
        // $this->tearDownFileSystem(); // Clean up temp storage
        // StaticStorage::restore(); // Restore original storage driver - Remove restore() call
        // StaticStorage::$storage = null; // REMOVE THIS - Incorrectly tries to access non-existent static property

        // Clean up the test file (optional, but good practice)
        $filePath = $this->storage->getDisk()->path('test/simple_assoc.json');
        if (file_exists($filePath)) {
            unlink($filePath);
        }
        // Clean up other test files if necessary (or rely on storage fake/clear if implemented)
        // Use reflection to reset static instance in DataHub if necessary (copied from ModificatorsTest)
        $reflection = new \ReflectionClass(\App\AiRudeDepot\Storage\DataHub::class);
        $property = $reflection->getProperty('staticStorageInstance');
        $property->setValue(null);
        // Ideally, clear the whole test disk if possible
        $this->storage->getDisk()->deleteDirectory('.');
        parent::tearDown();
    }

    /**
     * Test that FormComponent correctly retrieves form state from a single node.
     */
    public function testProcessFormComponent_SingleFormNode()
    {
        $node = [
            'component' => 'SomeComponent',
            'model' => ['form' => 'conflictingForm'] // Use the full path as formName
        ];
        // Expected result should map formName to its data
        $expectedResult = [
            'conflictingForm' => ['field2' => 'xyz', 'newField' => 'new', 'errors' => []],
        ];

        // Pass the DataHub instance and module slug
        $result = FormComponent::process($node, $this->storage, 'module1');
        if ($this->allowVerbosity) {
            print_r("\n<br> ----- result testProcessFormComponent_SingleFormNode----- <br>\n");
            print_r($result);

            print_r("\n<br> ----- expectedResult ----- <br>\n");
            print_r($expectedResult);
            print_r("\n<br> ----- node ----- <br>\n");
            print_r($node);
        }

        $this->assertEquals($expectedResult, $result);
        // Also assert that the original node is untouched
        $this->assertEquals(['component' => 'SomeComponent', 'model' => ['form' => 'conflictingForm']], $node);
    }

    /**
     * Test recursive retrieval of form states from nested nodes.
     */
    public function testProcessFormComponent_NestedFormNodes()
    {
        $node = ['outer' => ['inner' => ['model' => ['form' => 'form1']]]];
        // Expect form1 data grouped by its name
        $expectedResult = ['form1' => ['initial' => 'value1', 'field2' => 'abc', 'errors' => []]];
        // Pass the DataHub instance and module slug
        $result = FormComponent::process($node, $this->storage, 'module1');

        if ($this->allowVerbosity) {
            print_r("\n<br> ----- result  testProcessFormComponent_NestedFormNodes----- <br>\n");
            print_r($result);

            print_r("\n<br> ----- expectedResult ----- <br>\n");
            print_r($expectedResult);

            print_r("\n<br> ----- node ----- <br>\n");
            print_r($node);
        }

        $this->assertEquals($expectedResult, $result);
        // Verify original node is unchanged
        $this->assertEquals(['outer' => ['inner' => ['model' => ['form' => 'form1']]]], $node);
    }

    public function testProcessFormComponent_NoFormNodes()
    {
        $node = [
            'component' => 'SimpleComponent',
            'data' => ['key' => 'value']
        ];
        $expectedFormState = []; // Empty array expected

        // Pass the DataHub instance and module slug
        $result = FormComponent::process($node, $this->storage, 'module1');
        if ($this->allowVerbosity) {


            print_r("\n<br> ----- result testProcessFormComponent_NoFormNodes----- <br>\n");

            print_r($result);

            print_r("\n<br> ----- expectedFormState ----- <br>\n");
            print_r($expectedFormState);
        }

        $this->assertEquals($expectedFormState, $result);
    }

    /**
     * Test that FormComponent returns an empty array if the form data source doesn't exist.
     */
    public function testProcessFormComponent_FormDataNotFound()
    {
        $node = ['component' => 'Form', 'model' => ['form' => 'unknownForm']];
        $expectedFormState = []; // No data saved for unknownForm

        // Pass the DataHub instance and module slug
        $result = FormComponent::process($node, $this->storage, 'module1');

        if ($this->allowVerbosity) {
            print_r("\n<br> ----- result testProcessFormComponent_FormDataNotFound----- <br>\n");
            print_r($result);
            print_r("\n<br> ----- node ----- <br>\n");
            print_r($node);

            print_r("\n<br> ----- expectedFormState ----- <br>\n");
            print_r($expectedFormState);
        }

        $this->assertEquals($expectedFormState, $result);
    }

    /**
     * Test that FormComponent correctly merges form states from multiple nodes, potentially overwriting.
     * The exact overwrite behavior depends on array_merge logic (later keys overwrite earlier ones).
     */
    public function testProcessFormComponent_MergingAndOverwrite()
    {
        $node = [
            'component' => 'Container',
            'sections' => [
                ['model' => ['form' => 'form1']],
                ['model' => ['form' => 'conflictingForm']]
            ]
        ];
        $expectedResult = [
            'form1' => ['initial' => 'value1', 'field2' => 'abc', 'errors' => []],
            'conflictingForm' => ['field2' => 'xyz', 'newField' => 'new', 'errors' => []]
        ];

        // Pass the DataHub instance and module slug
        $result = FormComponent::process($node, $this->storage, 'module1');
        $this->assertEquals($expectedResult, $result);
    }

    /**
     * Test nested forms in a complex structure.
     */
    public function testProcessFormComponent_NestedForms()
    {
        $node = ['outer' => ['inner' => ['model' => ['form' => 'nestedForm']]]];
        $expectedResult = ['nestedForm' => ['user' => ['name' => 'initialUser', 'email' => ''], 'errors' => []]];
        // Pass the DataHub instance and module slug
        $result = FormComponent::process($node, $this->storage, 'module1');
        $this->assertEquals($expectedResult, $result);
    }

    /**
     * Test invalid or non-existent form inputs.
     */
    public function testProcessFormComponent_InvalidInputs()
    {
        $node = ['model' => ['form' => 'invalidForm']];
        $expectedResult = [];
        // Pass the DataHub instance and module slug
        $result = FormComponent::process($node, $this->storage, 'module1');
        $this->assertEquals($expectedResult, $result);
    }

    /**
     * Test with an empty input node.
     */
    public function testProcessFormComponent_EmptyNode()
    {
        $node = [];
        $expectedFormState = [];

        // Pass the DataHub instance and module slug
        $result = FormComponent::process($node, $this->storage, 'module1');

        if ($this->allowVerbosity) {
            print_r("\n<br> ----- result testProcessFormComponent_EmptyNode----- <br>\n");
            print_r($result);


            print_r("\n<br> ----- expectedFormState ----- <br>\n");
            print_r($expectedFormState);
        }
        $this->assertEquals($expectedFormState, $result);
    }

    // New test method
    public function testDirectStorageSaveLoad()
    {
        // Use the instance property directly
        $loadedData = $this->storage->address('file!test/simple_assoc')->get();

        if ($this->allowDebug)
            Log::debug("[testDirectStorageSaveLoad] Loaded data via StaticStorage::get:", [$loadedData]);

        if ($this->allowVerbosity) {
            print_r("\n<br> ----- loadedData ----- <br>\n");
            print_r($loadedData);
        }

        // Assert it's the associative array we saved, NOT wrapped in an outer array
        $this->assertEquals(['key' => 'value', 'another' => 123], $loadedData);
    }

}
