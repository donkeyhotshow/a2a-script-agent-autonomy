<?php

namespace App\Console\Commands\Config;


return;

use App\Hooks\FileFacade;


class JsonOptions
{
    private static $files = [];

    public static function __callStatic($name, $arguments)
    {
        $ret = self::get_file($name);
        if (empty($arguments)) return $ret;

        if (count($arguments) == 1) {
            $call = $arguments[0];
            return $ret->$call;
        }

        print "error 35";
        exit();

    }


    public static function get_file($filename)
    {
        if (!empty(self::$files[$filename])) return self::$files[$filename];
        $contents = json_decode(json: FileFacade::get(base_path('resources/config/data/' . $filename . '.json')), associative: true);
        self::$files[$filename] = new class ($contents) {
            protected $data;

            public function __construct($contents)
            {
                $this->data = $contents;
                return $this;
            }

            public function __invoke($name)
            {
                print 'invoke ' . $name;
                exit();
            }

            public function __call($name, $value)
            {
//                print 'call ' . $name . ' val ' . $value;
//                exit();
                $this->data[$name] = $value;
            }

            public function __get($name)
            {
                if (array_key_exists($name, $this->data)) {
                    return $this->data[$name];
                }
                return null;
            }

        };
        return self::$files[$filename];

    }
}
