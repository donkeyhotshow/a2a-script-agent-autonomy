export APACHE_USER=$(ps -ef | grep -E '(httpd|apache2|apache)' | grep -v `whoami` | grep -v root | head -n1 | awk '{print $1}')
# mkdir ./storage/app/livewire-

# Определение массива папок
FOLDERS_TO_CHMOD=("app" "resources" "public" "storage" "storage/ai" "install-modules/aiInstaller"  "install-modules/aiCore" "storage/aiCore" "storage/aiSandbox" "storage/aiTestEnv" "bootstrap/cache" "public" "storage/logs" "storage/framework" "storage/framework/views" "storage/framework/sessions" "storage/framework/cache" "storage/logs" )

# Применение прав доступа к папкам
for folder in "${FOLDERS_TO_CHMOD[@]}"; do
  find "$folder" -type f -exec chmod 777 {} \;
  find "$folder" -type d -exec chmod 777 {} \;
  chgrp -R "$APACHE_USER" "$folder"
  chmod -R ug+rw "$folder"
done


#find . -type f -exec chmod 777 {} \;
#find . -type d -exec chmod 777 {} \;
#chgrp -R $APACHE_USER ./storage ./bootstrap/cache
#chmod -R ug+rw ./bootstrap/cache ./storage


#restorecon -Rv .
#chcon -R -t httpd_sys_rw_content_t bootstrap/cache
#chcon -R -t httpd_sys_rw_content_t storage
#chcon -R -t httpd_log_t storage/logs
