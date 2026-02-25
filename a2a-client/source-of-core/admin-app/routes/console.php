<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;


/*Schedule::call(function () {
    Supplier::update(['parser_status' => 4]);

})->twiceDaily(1, 9)->name('reset_parser_status')->withoutOverlapping(700);*/

Schedule::call(function () {
    $defPath = storage_path('logs/laravel.log');
    if (file_exists($defPath)) {
        $newLogPath = storage_path('logs/laravel_' . time() . '.log');
        rename($defPath, $newLogPath);
        // touch($defPath);
        // chmod($defPath, 0777);
    }

    if (file_exists($defPath)) {
        $newLogPath = storage_path('logs/shedule_' . time() . '.log');
        // rename(storage_path('logs/shedule.log'), $newLogPath);
        // chmod($newLogPath, 0777);
    }

})->dailyAt(0)->name('log_store');#->everyMinute()

/*Schedule::call(function () {

    $slowdown = 5;
//    $slowdown = 1;
//    $slowdown = 0.1;

    //zaplatka. nutaladno
    foreach (Product::get() as $product) $product->generate_name_for_search();

    //generator begin
    WordGenStep1::create_temp_database();
    //generator step1
    $products = Product::enabled()->get();


    foreach ($products as $product) {
        $product_name = $product->generate_name_for_search();
        $parts = explode(" ", $product_name);

        $parent_word_id = 0;
        foreach ($parts as $word) {
            WordGenStep1::parseWordsData($word, 0, $parent_word_id);
//            WordGenStep1::parseWordsData($word, $product->category_id, $parent_word_id);
            sleep($slowdown);
        }

    }
    //generator step2

    $words = DB::select("select * from _tblwords");


    foreach ($words as $word) {
        $set = [];
        $set = array_values(array_diff(array_unique((array_merge(WordGenStep2::get_high_id($word->parent_id), WordGenStep2::get_low_ids($word->id)))), [$word->id]));
        DB::statement("update _tblwords set words_set = '" . json_encode($set, JSON_NUMERIC_CHECK) . "' where id=" . $word->id);
        sleep($slowdown);

    }

    //generator step3


    $products = Product::enabled()->get();

    foreach ($products as $product) {
        $product_name = $product->generate_name_for_search();

        $parts = explode(" ", $product_name);
        foreach ($parts as $kword) {
            $product_id = $product->id;

            WordGenStep3::parse_kword_data($kword, $product_id, $product_name, 0);
//                WordGenStep3::parse_kword_data($kword,$product_id,$product_name,$category_id);
            sleep($slowdown);
        }
    }

    WordGenStep1::apply_temp_database();


})->dailyAt(3)->name('search_parser4')->withoutOverlapping(700);//->everyMinute()*/


/*Schedule::call(function () {
    // Source and destination paths
  $sourcePath = '/home/aleon/apps/admin-app/storage/ai/app';
      $destinationPath = app_path('Console/Commands/Root/1');

      // Check if the source directory exists
      if (FileFacade::exists($sourcePath)) {
          // Get all files in the source directory
          $files = FileFacade::files($sourcePath);

          // Loop through each file
          foreach ($files as $file) {
              // Generate a new name for the file (e.g., add a timestamp or unique ID)
              $newName = time() . '_' . $file->getFilename();

              // Ensure the destination directory exists
              FileFacade::ensureDirectoryExists($destinationPath);

              // Rename the current file (optional)
              FileFacade::move($file->getRealPath(), $file->getPath() . '/' . $newName);

              // Now, move the renamed file to the destination
              FileFacade::move($file->getPath() . '/' . $newName, $destinationPath . '/' . $newName);
          }
      }

})->everyMinute()->name('move_files');*/


/*
Schedule::call(function () {
        $orders = \App\Models\_OLD\Order::whereNot('send_email', 0)->get();

        if ($orders) {
            foreach ($orders as $order) {
                if ($order->send_email == 1) {  ///new order
    //                     Mail::to('darkaleon10@gmail.com')->send(new OrderAdded());
                    Mail::to($order->checkout_email)->send(new OrderAdded($order));
                }
                if ($order->send_email == 2) {  ///approved order
                    Mail::to($order->checkout_email)->send(new OrderApproved($order));
                }
                if ($order->send_email == 3) {  ///payed order
                    Mail::to($order->checkout_email)->send(new OrderPayed($order));
                }
                if ($order->send_email == 4) {  ///dispatched order
                    Mail::to($order->checkout_email)->send(new OrderDispatched($order));
                }
                if ($order->send_email == 5) {  ///canceled order
                    Mail::to($order->checkout_email)->send(new OrderCancelled($order));
                }
                if ($order->send_email == 6) {  ///delivered order
                    Mail::to($order->checkout_email)->send(new OrderDelivered($order));
                }

                $order->send_email = 0;
                $order->save();
                sleep(1);
            }
        }


})->everyMinute()->name('emails');*/
